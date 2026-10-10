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

export function seedCommunity(): { topicsInserted: number; commentsInserted: number } {
  const fixtures = JSON.parse(readFileSync(resolve(process.cwd(), "data/seed/comments.json"), "utf8")) as { id: string; authorLabel: string; body: string; createdAt: number }[];
  const db = getDatabase();
  return transaction(db, () => {
    let topicsInserted = 0; let commentsInserted = 0;
    const jobs = db.prepare("SELECT id FROM jobs WHERE source_type='synthetic' ORDER BY id").all();
    for (const job of jobs) {
      const proposedId = `topic-${job.id}`;
      topicsInserted += Number(db.prepare("INSERT INTO topics VALUES (?,?) ON CONFLICT(job_id) DO NOTHING").run(proposedId, job.id).changes);
      const topicId = db.prepare("SELECT id FROM topics WHERE job_id=?").get(job.id)!.id;
      for (const item of fixtures) commentsInserted += Number(db.prepare("INSERT INTO comments VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING").run(`${topicId}:${item.id}`, topicId, item.authorLabel, item.body, 1, item.createdAt).changes);
    }
    return { topicsInserted, commentsInserted };
  });
}

// Public snapshots have their own source file; never attach fictional seed comments.
export function seedPublicJobs(): { inserted: number } {
  const jobs = JSON.parse(readFileSync(resolve(process.cwd(), "data/seed/public-jobs.json"), "utf8")) as Job[];
  const db = getDatabase();
  return transaction(db, () => {
    const insert = db.prepare("INSERT INTO jobs(id,job_key,company,title,location,category,description,source_type,source_url,apply_url,published_at,listed_at,last_checked_at,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(job_key) DO NOTHING");
    let inserted = 0;
    for (const job of jobs) {
      if (job.sourceType !== "public" || !job.sourceUrl || new URL(job.sourceUrl).protocol !== "https:" || !job.applyUrl || new URL(job.applyUrl).protocol !== "https:") throw new Error("Public jobs need HTTPS employer source and application URLs");
      inserted += Number(insert.run(job.id, job.jobKey, job.company, job.title, job.location, job.category, job.description, job.sourceType, job.sourceUrl, job.applyUrl, job.publishedAt, job.listedAt ?? null, job.lastCheckedAt, job.status).changes);
      const stored = db.prepare("SELECT id FROM jobs WHERE job_key=?").get(job.jobKey)!;
      db.prepare("INSERT INTO topics VALUES (?,?) ON CONFLICT(job_id) DO NOTHING").run(`topic-${stored.id}`, stored.id);
    }
    return { inserted };
  });
}
