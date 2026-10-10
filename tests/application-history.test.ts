import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { closeDatabase, getDatabase } from "../src/server/db.ts";
import { seedJobs } from "../src/server/seed.ts";
import { deleteApplication, listApplicationHistory, listApplications, saveApplication, updateApplication } from "../src/server/applications.ts";
import type { ApplicationStatus, Result } from "../src/shared/contracts.ts";

function value<T>(result: Result<T>): T { assert.ok(result.ok); return result.value; }

test("Tracker history: durable, atomic and scoped to the current user", async t => {
  const directory = mkdtempSync(join(tmpdir(), "hireland-history-"));
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(directory, "test.sqlite");
  try {
    seedJobs();
    const application = value(await saveApplication("job-01"));
    await t.test("initial save records one event; repeated saves do not reset status or add events", async () => {
      const initial = value(await listApplicationHistory());
      assert.equal(initial.length, 1);
      assert.deepEqual({ kind: initial[0].kind, from: initial[0].fromStatus, to: initial[0].toStatus, time: initial[0].createdAt },
        { kind: "CREATED", from: null, to: "SAVED", time: application.createdAt });
      value(await updateApplication(application.id, "APPLIED"));
      assert.equal(value(await saveApplication("job-01")).status, "APPLIED");
      assert.equal(value(await listApplicationHistory()).length, 2);
    });
    await t.test("status changes preserve exact previous/new values and order, including corrections", async () => {
      value(await updateApplication(application.id, "INTERVIEW"));
      const latest = value(await updateApplication(application.id, "APPLIED"));
      const history = value(await listApplicationHistory());
      assert.deepEqual(history.map(event => [event.fromStatus, event.toStatus]), [["INTERVIEW", "APPLIED"], ["APPLIED", "INTERVIEW"], ["SAVED", "APPLIED"], [null, "SAVED"]]);
      assert.equal(history[0].createdAt, latest.updatedAt);
      assert.ok(history[0].createdAt > history[1].createdAt);
    });
    await t.test("no-op and invalid updates leave timestamps and history untouched", async () => {
      const before = value(await listApplicationHistory());
      const applicationBefore = value(await listApplications())[0];
      assert.deepEqual(value(await updateApplication(application.id, "APPLIED")), applicationBefore);
      assert.equal((await updateApplication(application.id, "INVALID" as ApplicationStatus)).ok, false);
      assert.equal((await updateApplication("missing-application", "OFFER")).ok, false);
      assert.deepEqual(value(await listApplicationHistory()), before);
    });
    await t.test("other users' history cannot be listed or altered", async () => {
      const db = getDatabase();
      db.exec("INSERT INTO users VALUES ('other-user','Other'); INSERT INTO applications VALUES ('foreign-app','other-user','job-02','SAVED',1,1); INSERT INTO application_status_events(application_id,to_status,kind,created_at) VALUES ('foreign-app','SAVED','CREATED',1)");
      assert.ok(value(await listApplicationHistory()).every(event => event.applicationId === application.id));
      assert.equal((await updateApplication("foreign-app", "OFFER")).ok, false);
      assert.equal((await deleteApplication("foreign-app")).ok, false);
      assert.equal(db.prepare("SELECT count(*) AS n FROM application_status_events WHERE application_id='foreign-app'").get()?.n, 1);
    });
    await t.test("failed log writes roll back both status edits and initial saves", async () => {
      const db = getDatabase();
      const before = value(await listApplications())[0];
      const history = value(await listApplicationHistory());
      db.exec("CREATE TEMP TRIGGER reject_history BEFORE INSERT ON application_status_events BEGIN SELECT RAISE(ABORT,'simulated history write failure'); END");
      assert.equal((await updateApplication(application.id, "OFFER")).ok, false);
      assert.equal((await saveApplication("job-03")).ok, false);
      assert.deepEqual(value(await listApplications()), [before]);
      assert.deepEqual(value(await listApplicationHistory()), history);
      db.exec("DROP TRIGGER reject_history");
    });
    await t.test("a new process reads saved history", () => {
      closeDatabase();
      const child = spawnSync(process.execPath, ["--conditions=react-server", "--input-type=module", "-e", "const {listApplicationHistory}=await import('./src/server/applications.ts');const r=await listApplicationHistory();if(!r.ok||r.value.length!==4||r.value[0].fromStatus!=='INTERVIEW'||r.value[0].toStatus!=='APPLIED')process.exit(1);const {closeDatabase}=await import('./src/server/db.ts');closeDatabase();"], { env: process.env, encoding: "utf8" });
      assert.equal(child.status, 0, child.stderr);
    });
    await t.test("removing a tracker record removes its history and preserves other records", async () => {
      value(await deleteApplication(application.id));
      assert.equal(value(await listApplicationHistory()).length, 0);
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM application_status_events").get()?.n, 1);
    });
  } finally {
    closeDatabase();
    if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});

test("History migration preserves legacy business data and records an honest baseline only once", async () => {
  const directory = mkdtempSync(join(tmpdir(), "hireland-history-migration-"));
  const path = join(directory, "legacy.sqlite");
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = path;
  try {
    const legacy = new DatabaseSync(path);
    const sql = readFileSync("db/migrations/001_initial.sql", "utf8");
    legacy.exec(sql);
    legacy.exec(`CREATE TABLE schema_migrations(version TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at INTEGER NOT NULL) STRICT;
      INSERT INTO users VALUES ('demo-user','Demo Student');
      INSERT INTO jobs(id,job_key,company,title,location,category,description,source_type) VALUES ('legacy-job','legacy','Fictional company','Fictional role','Dublin','Technology','Fictional JD','synthetic');
      INSERT INTO profiles VALUES ('demo-user','Fictional CV','hash','["Technology"]',1);
      INSERT INTO applications VALUES ('legacy-app','demo-user','legacy-job','INTERVIEW',100,200);
      INSERT INTO topics VALUES ('legacy-topic','legacy-job');
      INSERT INTO comments VALUES ('legacy-comment','legacy-topic','Fictional author','Fictional comment',1,1);
      INSERT INTO purchases VALUES ('legacy-purchase','demo-user','legacy-topic',99,'eur','cs_test_fixture','PAID',1,1);
      INSERT INTO entitlements VALUES ('demo-user','legacy-topic','legacy-purchase',1);
      INSERT INTO assessments VALUES ('legacy-assessment','demo-user','legacy-job','hash','v1','fixture','{}',1);`);
    legacy.prepare("INSERT INTO schema_migrations VALUES ('001_initial.sql',?,1)").run(createHash("sha256").update(sql).digest("hex"));
    const tables = ["users", "jobs", "profiles", "applications", "topics", "comments", "purchases", "entitlements", "assessments"];
    const queries = tables.map(table => `SELECT ${legacy.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name).join(",")} FROM ${table}`);
    const before = queries.map(query => legacy.prepare(query).all());
    legacy.close();
    const start = Date.now();
    const db = getDatabase();
    assert.deepEqual(queries.map(query => db.prepare(query).all()), before);
    const history = value(await listApplicationHistory());
    assert.equal(history.length, 1);
    assert.equal(history[0].kind, "BASELINE");
    assert.equal(history[0].fromStatus, null);
    assert.equal(history[0].toStatus, "INTERVIEW");
    assert.ok(history[0].createdAt >= start);
    closeDatabase();
    assert.deepEqual(value(await listApplicationHistory()), history);
    assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM schema_migrations").get()?.n, 5);
  } finally {
    closeDatabase();
    if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
