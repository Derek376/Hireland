import { closeDatabase } from "../src/server/db.ts";
import { seedJobs, seedCommunity } from "../src/server/seed.ts";
try { console.log(JSON.stringify({ status: "PASS", ...seedJobs(), ...seedCommunity() })); }
finally { closeDatabase(); }
