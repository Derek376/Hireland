import "server-only";
import type { Job, Result } from "../shared/contracts.ts";
import { getDatabase } from "./db.ts";
import { databaseResult, failure, success, validId } from "./results.ts";

type JobRow = { id: string; job_key: string; company: string; title: string; location: string; category: Job["category"]; description: string; source_type: Job["sourceType"]; source_url: string | null; apply_url: string | null; published_at: number | null; listed_at: number | null; last_checked_at: number | null; status: Job["status"] };
function mapJob(row: JobRow): Job {
  return { id: row.id, jobKey: row.job_key, company: row.company, title: row.title, location: row.location, category: row.category, description: row.description, sourceType: row.source_type, sourceUrl: row.source_url, applyUrl: row.apply_url, publishedAt: row.published_at, listedAt: row.listed_at, lastCheckedAt: row.last_checked_at, status: row.status };
}
export async function listJobs(input: { query?: string } = {}): Promise<Result<Job[]>> {
  if (input.query !== undefined && (typeof input.query !== "string" || input.query.length > 120)) return failure("VALIDATION", "Search must be 120 characters or fewer.");
  return databaseResult(async () => {
    const query = (input.query ?? "").trim().replace(/[\\%_]/g, character => `\\${character}`);
    const pattern = `%${query}%`;
    const rows = getDatabase().prepare("SELECT * FROM jobs WHERE title LIKE ? ESCAPE char(92) OR company LIKE ? ESCAPE char(92) OR location LIKE ? ESCAPE char(92) OR description LIKE ? ESCAPE char(92) ORDER BY company,title,id").all(pattern, pattern, pattern, pattern) as JobRow[];
    return success(rows.map(mapJob));
  });
}
export async function getJob(jobId: string): Promise<Result<Job>> {
  if (!validId(jobId)) return failure("NOT_FOUND", "This job could not be found.");
  return databaseResult(async () => {
    const row = getDatabase().prepare("SELECT * FROM jobs WHERE id=?").get(jobId) as JobRow | undefined;
    return row ? success(mapJob(row)) : failure("NOT_FOUND", "This job could not be found.");
  });
}
