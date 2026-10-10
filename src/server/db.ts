import "server-only";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DEMO_USER_ID } from "../shared/contracts.ts";

// One connection per process, also reused across development module reloads.
const state = globalThis as typeof globalThis & { hirelandDatabase?: { path: string; db: DatabaseSync } };

export function transaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = work();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function applyMigrations(db: DatabaseSync): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at INTEGER NOT NULL) STRICT");
  const directory = resolve(process.cwd(), "db/migrations");
  for (const version of readdirSync(directory).filter(name => /^\d+_.*\.sql$/.test(name)).sort()) {
    const sql = readFileSync(resolve(directory, version), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    transaction(db, () => {
      const existing = db.prepare("SELECT checksum FROM schema_migrations WHERE version=?").get(version);
      if (existing) {
        if (existing.checksum !== checksum) throw new Error(`Applied migration changed: ${version}. Add a new migration instead.`);
        return;
      }
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations VALUES (?,?,?)").run(version, checksum, Date.now());
    });
  }
}

export function getDatabase(): DatabaseSync {
  const path = resolve(process.cwd(), process.env.DATABASE_PATH || "./data/hireland.sqlite");
  if (state.hirelandDatabase) {
    if (state.hirelandDatabase.path !== path) throw new Error("Database path changed while a connection is open");
    return state.hirelandDatabase.db;
  }
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path, { enableForeignKeyConstraints: true, timeout: 5000 });
  try {
    db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;");
    applyMigrations(db);
    db.prepare("INSERT INTO users(id,demo_name) VALUES (?,?) ON CONFLICT(id) DO NOTHING").run(DEMO_USER_ID, "Demo Student");
    state.hirelandDatabase = { path, db };
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function closeDatabase(): void {
  state.hirelandDatabase?.db.close();
  delete state.hirelandDatabase;
}
