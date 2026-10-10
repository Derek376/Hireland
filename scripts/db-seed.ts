import { closeDatabase } from "../src/server/db.ts";
import { seedJobs, seedCommunity, seedPublicJobs } from "../src/server/seed.ts";
try {
  const demo = seedJobs();
  const publicJobs = seedPublicJobs();
  console.log(JSON.stringify({ status: "PASS", total: demo.total + publicJobs.inserted, syntheticInserted: demo.inserted, publicInserted: publicJobs.inserted, ...seedCommunity() }));
}
finally { closeDatabase(); }
