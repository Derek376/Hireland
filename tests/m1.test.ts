import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import type { ApplicationStatus, Category, Result } from "../src/shared/contracts.ts";
import { closeDatabase, getDatabase } from "../src/server/db.ts";
import { seedJobs } from "../src/server/seed.ts";
import { getJob, listJobs } from "../src/server/jobs.ts";
import { clearProfile, getProfile, saveProfile } from "../src/server/profile.ts";
import { deleteApplication, listApplications, saveApplication, updateApplication } from "../src/server/applications.ts";

function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}
function error<T>(result: Result<T>, code: string): void {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected an error");
  assert.equal(result.error.code, code);
}

test("M1: one database supports the complete local workflow", async t => {
  const directory = mkdtempSync(join(tmpdir(), "hireland-m1-"));
  const path = join(directory, "test.sqlite");
  const oldPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = path;
  try {
    await t.test("migrate and seed are repeatable without deleting existing user data", async () => {
      const db = getDatabase();
      assert.equal(db.prepare("PRAGMA foreign_keys").get()?.foreign_keys, 1);
      assert.equal(db.prepare("PRAGMA journal_mode").get()?.journal_mode, "wal");
      assert.equal(db.prepare("SELECT count(*) AS n FROM schema_migrations").get()?.n, 1);
      assert.deepEqual(seedJobs(), { total: 10, inserted: 10 });
      const profile = value(await saveProfile({ cvText: "Fictional React developer", preferences: ["Technology"] }));
      const application = value(await saveApplication("job-01"));
      assert.deepEqual(seedJobs(), { total: 10, inserted: 0 });
      assert.deepEqual(value(await getProfile()), profile);
      assert.equal(value(await listApplications())[0].id, application.id);
      closeDatabase();
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM schema_migrations").get()?.n, 1);
    });
    await t.test("search is literal, parameterized, and handles no results and invalid input", async () => {
      assert.equal(value(await listJobs()).length, 10);
      assert.equal(value(await listJobs({ query: "clover" })).length, 2);
      assert.equal(value(await listJobs({ query: "Cork" })).length, 2);
      assert.equal(value(await listJobs({ query: "no-such-role" })).length, 0);
      assert.equal(value(await listJobs({ query: "%" })).length, 0);
      assert.equal(value(await listJobs({ query: "' OR 1=1 --" })).length, 0);
      error(await listJobs({ query: "a".repeat(121) }), "VALIDATION");
      error(await getJob("missing-job"), "NOT_FOUND");
      error(await getJob("../../etc/passwd"), "NOT_FOUND");
      const unknown = value(await getJob("job-01"));
      assert.equal(unknown.publishedAt, null);
      assert.equal(unknown.status, "UNKNOWN");
      assert.equal(unknown.applyUrl, null);
      assert.equal(value(await getJob("job-09")).status, "CLOSED");
    });
    await t.test("profile validates on server and can be overwritten without changing identity", async () => {
      error(await saveProfile({ cvText: "   ", preferences: ["Technology"] }), "VALIDATION");
      error(await saveProfile({ cvText: "x".repeat(12001), preferences: ["Technology"] }), "VALIDATION");
      error(await saveProfile({ cvText: "CV", preferences: [] }), "VALIDATION");
      error(await saveProfile({ cvText: "CV", preferences: ["Invalid"] as unknown as Category[] }), "VALIDATION");
      const cv = readFileSync("data/seed/demo-cv.txt", "utf8");
      const result = value(await saveProfile({ cvText: cv, preferences: ["Other", "Technology", "Technology"] }));
      assert.deepEqual(result.preferences, ["Technology", "Other"]);
      assert.equal(value(await getProfile())?.cvText, cv.trim());
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM profiles").get()?.n, 1);
      const hash = getDatabase().prepare("SELECT cv_hash FROM profiles").get()?.cv_hash;
      value(await saveProfile({ cvText: cv + "\nFictional additional project.", preferences: ["Technology"] }));
      assert.notEqual(getDatabase().prepare("SELECT cv_hash FROM profiles").get()?.cv_hash, hash);
    });
    await t.test("duplicate save preserves application ID and existing status", async () => {
      const first = value(await saveApplication("job-01"));
      value(await updateApplication(first.id, "APPLIED"));
      const repeated = value(await saveApplication("job-01"));
      assert.equal(repeated.id, first.id);
      assert.equal(repeated.status, "APPLIED");
      assert.equal(value(await listApplications()).length, 1);
      error(await saveApplication("unknown-job"), "NOT_FOUND");
      error(await updateApplication(first.id, "INVALID" as ApplicationStatus), "VALIDATION");
      assert.equal(value(await listApplications())[0].status, "APPLIED");
    });
    await t.test("records owned by another user cannot be listed, updated or deleted", async () => {
      const db = getDatabase();
      db.exec("INSERT INTO users VALUES ('other-user','Other Demo'); INSERT INTO applications VALUES ('foreign-app','other-user','job-02','SAVED',1,1)");
      assert.equal(value(await listApplications()).length, 1);
      error(await updateApplication("foreign-app", "OFFER"), "NOT_FOUND");
      error(await deleteApplication("foreign-app"), "NOT_FOUND");
      assert.equal(db.prepare("SELECT status FROM applications WHERE id='foreign-app'").get()?.status, "SAVED");
    });
    await t.test("seed preserves payment and entitlement records", () => {
      const db = getDatabase();
      db.exec("INSERT INTO topics VALUES ('test-topic','job-01'); INSERT INTO purchases VALUES ('test-purchase','demo-user','test-topic',99,'eur','cs_test_fixture','PAID',1,1); INSERT INTO entitlements VALUES ('demo-user','test-topic','test-purchase',1)");
      seedJobs();
      assert.equal(db.prepare("SELECT count(*) AS n FROM entitlements").get()?.n, 1);
      assert.equal(db.prepare("SELECT status FROM purchases").get()?.status, "PAID");
    });
    await t.test("profile and application survive a new Node process", () => {
      closeDatabase();
      const child = spawnSync(process.execPath, ["--conditions=react-server", "--input-type=module", "-e", "const {getProfile}=await import('./src/server/profile.ts');const {listApplications}=await import('./src/server/applications.ts');const p=await getProfile();const a=await listApplications();if(!p.ok||!p.value||!a.ok||a.value[0]?.status!=='APPLIED')process.exit(1);console.log('persisted');const {closeDatabase}=await import('./src/server/db.ts');closeDatabase();"], { env: process.env, encoding: "utf8" });
      assert.equal(child.status, 0, child.stderr);
      assert.equal(child.stdout.trim(), "persisted");
    });
    await t.test("editing applied migrations is rejected without deleting records", () => {
      const db = getDatabase();
      const checksum = db.prepare("SELECT checksum FROM schema_migrations").get()?.checksum as string;
      db.prepare("UPDATE schema_migrations SET checksum='changed'").run();
      closeDatabase();
      assert.throws(() => getDatabase(), /Applied migration changed/);
      const repair = new DatabaseSync(path);
      repair.prepare("UPDATE schema_migrations SET checksum=?").run(checksum);
      repair.close();
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM applications WHERE user_id='demo-user'").get()?.n, 1);
    });
    await t.test("clear profile removes assessments only for current user and keeps applications", async () => {
      const db = getDatabase();
      db.exec("INSERT INTO assessments VALUES ('assessment-1','demo-user','job-01','hash','v1','test-model','{}',1); INSERT INTO assessments VALUES ('assessment-2','other-user','job-02','hash','v1','test-model','{}',1)");
      value(await clearProfile());
      assert.equal(value(await getProfile()), null);
      assert.equal(db.prepare("SELECT count(*) AS n FROM assessments WHERE user_id='demo-user'").get()?.n, 0);
      assert.equal(db.prepare("SELECT count(*) AS n FROM assessments WHERE user_id='other-user'").get()?.n, 1);
      assert.equal(value(await listApplications()).length, 1);
      const application = value(await listApplications())[0];
      value(await deleteApplication(application.id));
      assert.equal(value(await listApplications()).length, 0);
      error(await deleteApplication(application.id), "NOT_FOUND");
    });
  } finally {
    closeDatabase();
    if (oldPath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = oldPath;
    rmSync(directory, { recursive: true, force: true });
  }
});
