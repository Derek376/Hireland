import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const [major, minor] = process.versions.node.split('.').map(Number);
assert(major === 24 && minor >= 16, 'Use Node 24.16+ (24.x); see .nvmrc');
for (const [name, version] of Object.entries({ ...manifest.dependencies, ...manifest.devDependencies })) {
  const installed = JSON.parse(readFileSync(new URL(`../node_modules/${name}/package.json`, import.meta.url), 'utf8'));
  assert.equal(installed.version, version, `${name}: run npm ci`);
}
const sql = readFileSync(new URL('../db/migrations/001_initial.sql', import.meta.url), 'utf8');
const dir = mkdtempSync(join(tmpdir(), 'hireland-m0-'));
let db;
try {
  const path = join(dir, 'check.sqlite');
  db = new DatabaseSync(path, { enableForeignKeyConstraints: true, timeout: 5000 });
  db.exec(sql);
  db.exec(sql); // Same initial schema can be applied twice without dropping data.
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  assert.equal(tables.length, 9);
  db.exec(`INSERT INTO users VALUES ('demo-user','Demo Student');
    INSERT INTO jobs(id,job_key,company,title,location,category,description,source_type)
      VALUES ('job-1','synthetic:job-1','Fictional Company','Graduate Developer','Dublin','Technology','Fictional JD','synthetic');
    INSERT INTO profiles VALUES ('demo-user','Fictional CV','hash','["Technology"]',1);
    INSERT INTO applications VALUES ('app-1','demo-user','job-1','SAVED',1,1);
    INSERT INTO topics VALUES ('topic-1','job-1');
    INSERT INTO comments VALUES ('comment-1','topic-1','Fictional Author','Fictional comment',1,1);
    INSERT INTO purchases VALUES ('purchase-1','demo-user','topic-1',99,'eur','cs_test_fixture','PAID',1,1);
    INSERT INTO entitlements VALUES ('demo-user','topic-1','purchase-1',1);`);
  assert.throws(() => db.exec("INSERT INTO applications VALUES ('app-2','demo-user','job-1','SAVED',1,1)"), /UNIQUE constraint/);
  assert.throws(() => db.exec("UPDATE applications SET status='INVALID'"), /CHECK constraint/);
  assert.throws(() => db.exec("INSERT INTO jobs(id,job_key,company,title,location,category,description,source_type) VALUES ('duplicate','synthetic:job-1','Fiction','Junior','Dublin','Technology','JD','synthetic')"), /UNIQUE constraint/);
  assert.throws(() => db.exec("INSERT INTO topics VALUES ('topic-2','missing-job')"), /FOREIGN KEY constraint/);
  assert.throws(() => db.exec("INSERT INTO comments VALUES ('bad','topic-1','Author',' ',1,1)"), /CHECK constraint/);
  assert.throws(() => db.exec("UPDATE purchases SET expected_amount=0"), /CHECK constraint/);
  assert.throws(() => db.exec("INSERT INTO purchases VALUES ('purchase-2','demo-user','topic-1',99,'eur','cs_test_fixture','PENDING',1,1)"), /UNIQUE constraint/);
  assert.throws(() => db.exec("INSERT INTO entitlements VALUES ('demo-user','topic-1','purchase-1',2)"), /UNIQUE constraint/);
  db.exec("INSERT INTO jobs(id,job_key,company,title,location,category,description,source_type) VALUES ('job-2','synthetic:job-2','Fiction','Junior','Dublin','Technology','JD','synthetic'); INSERT INTO topics VALUES ('topic-2','job-2');");
  db.exec("INSERT INTO purchases VALUES ('unfulfilled','demo-user','topic-1',99,'eur','cs_test_other_fixture','PAID',1,1)");
  assert.throws(() => db.exec("INSERT INTO entitlements VALUES ('demo-user','topic-2','unfulfilled',2)"), /FOREIGN KEY constraint/);
  db.exec('BEGIN IMMEDIATE; UPDATE applications SET status=\'APPLIED\'; ROLLBACK;');
  assert.equal(db.prepare('SELECT status FROM applications').get().status, 'SAVED');
  const sqliteVersion = db.prepare('SELECT sqlite_version() AS version').get().version;
  db.close();
  db = new DatabaseSync(path);
  assert.equal(db.prepare('SELECT count(*) AS n FROM applications').get().n, 1);
  assert.equal(db.prepare('SELECT count(*) AS n FROM entitlements').get().n, 1);
  console.log(JSON.stringify({ status: 'PASS', node: process.versions.node, sqlite: sqliteVersion, tables: tables.length, checks: ['exact package versions', 'schema reapply', 'foreign keys', 'duplicate applications', 'status and comment validation', 'fixed price', 'unique Stripe session', 'unique entitlement', 'purchase ownership', 'transaction rollback', 'file persistence'] }, null, 2));
} finally {
  db?.close();
  rmSync(dir, { recursive: true, force: true });
}
