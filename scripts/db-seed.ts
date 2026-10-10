import { closeDatabase } from "../src/server/db.ts";
import { seedJobs } from "../src/server/seed.ts";
try { console.log(JSON.stringify({ status: "PASS", ...seedJobs() })); }
finally { closeDatabase(); }
