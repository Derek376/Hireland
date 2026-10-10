import { closeDatabase, getDatabase } from "../src/server/db.ts";
try {
  const db = getDatabase();
  console.log(JSON.stringify({ status: "PASS", migrations: db.prepare("SELECT version FROM schema_migrations ORDER BY version").all() }));
} finally { closeDatabase(); }
