import "server-only";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Job } from "../shared/contracts.ts";
import { getDatabase, transaction } from "./db.ts";

export function seedJobs(): { total: number; inserted: number } {
  const jobs = JSON.parse(readFileSync(resolve(process.cwd(), "data/seed/jobs.json"), "utf8")) as Job[];
  const db = getDatabase();
  return transaction(db, () => {
    const insert = db.prepare("INSERT INTO jobs(id,job_key,company,title,location,category,description,source_type,source_url,apply_url,published_at,last_checked_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(job_key) DO NOTHING");
    let inserted = 0;
    for (const job of jobs) {
      if (job.sourceType !== "synthetic" || job.sourceUrl !== null || job.applyUrl !== null) throw new Error("Demo seed must contain synthetic jobs without fabricated URLs");
      inserted += Number(insert.run(job.id, job.jobKey, job.company, job.title, job.location, job.category, job.description, job.sourceType, job.sourceUrl, job.applyUrl, job.publishedAt, job.lastCheckedAt, job.status).changes);
    }
    return { total: Number(db.prepare("SELECT count(*) AS count FROM jobs").get()?.count ?? 0), inserted };
  });
}
