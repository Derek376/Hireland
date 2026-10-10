import "server-only";
import { randomUUID } from "node:crypto";
import { APPLICATION_STATUSES, type Application, type ApplicationStatus, type Result } from "../shared/contracts.ts";
import { getDatabase } from "./db.ts";
import { getCurrentDemoUser } from "./identity.ts";
import { getJob } from "./jobs.ts";
import { databaseResult, failure, success, validId } from "./results.ts";

type ApplicationRow = { id: string; job_id: string; status: ApplicationStatus; created_at: number; updated_at: number };
function mapApplication(row: ApplicationRow): Application {
  return { id: row.id, jobId: row.job_id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function listApplications(): Promise<Result<Application[]>> {
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const rows = getDatabase().prepare("SELECT * FROM applications WHERE user_id=? ORDER BY created_at DESC,id").all(user.id) as ApplicationRow[];
    return success(rows.map(mapApplication));
  });
}
export async function saveApplication(jobId: string): Promise<Result<Application>> {
  const job = await getJob(jobId);
  if (!job.ok) return job;
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const db = getDatabase();
    const time = Date.now();
    db.prepare("INSERT INTO applications VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,job_id) DO NOTHING").run(randomUUID(), user.id, jobId, "SAVED", time, time);
    const row = db.prepare("SELECT * FROM applications WHERE user_id=? AND job_id=?").get(user.id, jobId) as ApplicationRow;
    return success(mapApplication(row));
  });
}
export async function updateApplication(applicationId: string, status: ApplicationStatus): Promise<Result<Application>> {
  if (!validId(applicationId)) return failure("NOT_FOUND", "This application could not be found.");
  if (!APPLICATION_STATUSES.includes(status)) return failure("VALIDATION", "Choose a valid application status.");
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const row = getDatabase().prepare("UPDATE applications SET status=?,updated_at=? WHERE id=? AND user_id=? RETURNING *").get(status, Date.now(), applicationId, user.id) as ApplicationRow | undefined;
    return row ? success(mapApplication(row)) : failure("NOT_FOUND", "This application could not be found.");
  });
}
export async function deleteApplication(applicationId: string): Promise<Result<void>> {
  if (!validId(applicationId)) return failure("NOT_FOUND", "This application could not be found.");
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const result = getDatabase().prepare("DELETE FROM applications WHERE id=? AND user_id=?").run(applicationId, user.id);
    return result.changes ? success(undefined) : failure("NOT_FOUND", "This application could not be found.");
  });
}
