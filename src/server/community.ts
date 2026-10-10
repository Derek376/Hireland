import "server-only";
import { randomUUID } from "node:crypto";
import type { Comment, TopicComments } from "../shared/contracts.ts";
import { getDatabase } from "./db.ts";
import { getCurrentDemoUser } from "./identity.ts";
import { databaseResult, failure, success, validId } from "./results.ts";

export async function getTopicForJob(jobId: string) {
  return databaseResult(async () => {
    if (!validId(jobId)) return failure("NOT_FOUND", "Discussion not found.");
    const row = getDatabase().prepare("SELECT id,job_id FROM topics WHERE job_id=?").get(jobId);
    return row ? success({ id: String(row.id), jobId: String(row.job_id) }) : failure("NOT_FOUND", "Discussion not found. Run db:setup to add the demo discussions.");
  });
}
export async function getTopicComments(topicId: string) {
  return databaseResult<TopicComments>(async () => {
    const db = getDatabase();
    if (!validId(topicId) || !db.prepare("SELECT id FROM topics WHERE id=?").get(topicId)) return failure("NOT_FOUND", "Discussion not found.");
    const user = await getCurrentDemoUser();
    const unlocked = !!db.prepare("SELECT 1 FROM entitlements WHERE user_id=? AND topic_id=?").get(user.id, topicId);
    const totalCount = Number(db.prepare("SELECT count(*) AS n FROM comments WHERE topic_id=?").get(topicId)?.n);
    // Paid bodies never enter an unauthorized service response or React payload.
    const rows = db.prepare(`SELECT id,author_label,body,is_synthetic,created_at FROM comments WHERE topic_id=? ORDER BY created_at DESC,id DESC ${unlocked ? "" : "LIMIT 3"}`).all(topicId);
    const comments: Comment[] = rows.map(row => ({ id: String(row.id), authorLabel: String(row.author_label), body: String(row.body), isSynthetic: row.is_synthetic === 1, createdAt: Number(row.created_at) }));
    return success({ topicId, comments, totalCount, unlocked });
  });
}
export async function addComment(topicId: string, body: string) {
  return databaseResult<TopicComments>(async () => {
    if (typeof body !== "string" || !body.trim() || body.length > 1000) return failure("VALIDATION", "Write a comment of 1–1,000 characters.");
    const existing = await getTopicComments(topicId);
    if (!existing.ok) return existing;
    const user = await getCurrentDemoUser();
    getDatabase().prepare("INSERT INTO comments VALUES (?,?,?,?,?,?)").run(randomUUID(), topicId, user.demoName, body.trim(), 0, Date.now());
    return getTopicComments(topicId);
  });
}
