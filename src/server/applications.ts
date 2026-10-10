import "server-only";
import { randomUUID } from "node:crypto";
import { APPLICATION_STATUSES, type Application, type ApplicationStatus, type ApplicationStatusEvent, type Result } from "../shared/contracts.ts";
import { getDatabase, transaction } from "./db.ts";
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
export async function listApplicationHistory(): Promise<Result<ApplicationStatusEvent[]>> {
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const rows = getDatabase().prepare(`SELECT e.* FROM application_status_events e
      JOIN applications a ON a.id=e.application_id WHERE a.user_id=? ORDER BY e.id DESC`).all(user.id);
    return success(rows.map(row => ({ id: Number(row.id), applicationId: String(row.application_id),
      fromStatus: row.from_status as ApplicationStatus | null, toStatus: row.to_status as ApplicationStatus,
      kind: row.kind as ApplicationStatusEvent["kind"], createdAt: Number(row.created_at) })));
  });
}
export async function saveApplication(jobId: string): Promise<Result<Application>> {
  const job = await getJob(jobId);
  if (!job.ok) return job;
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const db = getDatabase();
    const time = Date.now();
    return transaction(db, () => {
      const inserted = db.prepare("INSERT INTO applications VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,job_id) DO NOTHING").run(randomUUID(), user.id, jobId, "SAVED", time, time);
      const row = db.prepare("SELECT * FROM applications WHERE user_id=? AND job_id=?").get(user.id, jobId) as ApplicationRow;
      if (inserted.changes) db.prepare("INSERT INTO application_status_events(application_id,from_status,to_status,kind,created_at) VALUES (?,NULL,'SAVED','CREATED',?)").run(row.id, time);
      return success(mapApplication(row));
    });
  });
}
export async function updateApplication(applicationId: string, status: ApplicationStatus): Promise<Result<Application>> {
  if (!validId(applicationId)) return failure("NOT_FOUND", "This application could not be found.");
  if (!APPLICATION_STATUSES.includes(status)) return failure("VALIDATION", "Choose a valid application status.");
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const db = getDatabase();
    return transaction(db, () => {
      const previous = db.prepare("SELECT * FROM applications WHERE id=? AND user_id=?").get(applicationId, user.id) as ApplicationRow | undefined;
      if (!previous) return failure("NOT_FOUND", "This application could not be found.");
      if (previous.status === status) return success(mapApplication(previous));
      const time = Math.max(Date.now(), previous.updated_at + 1);
      db.prepare("UPDATE applications SET status=?,updated_at=? WHERE id=? AND user_id=?").run(status, time, applicationId, user.id);
      db.prepare("INSERT INTO application_status_events(application_id,from_status,to_status,kind,created_at) VALUES (?,?,?,'CHANGED',?)").run(applicationId, previous.status, status, time);
      return success(mapApplication({ ...previous, status, updated_at: time }));
    });
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
