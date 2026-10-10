import "server-only";
import { randomUUID } from "node:crypto";
import type { Comment, CommentReply, Reaction, ReactionSummary, TopicComments } from "../shared/contracts.ts";
import { getDatabase, transaction } from "./db.ts";
import { getCurrentDemoUser } from "./identity.ts";
import { databaseResult, failure, success, validId } from "./results.ts";

function reactions(userId: string, id: string, reply = false): ReactionSummary {
  const row = getDatabase().prepare(`SELECT COALESCE(SUM(reaction='LIKE'),0) AS likes,COALESCE(SUM(reaction='DISLIKE'),0) AS dislikes,MAX(CASE WHEN user_id=? THEN reaction END) AS mine FROM comment_reactions WHERE ${reply ? "reply_id" : "comment_id"}=?`).get(userId, id)!;
  return { likes: Number(row.likes), dislikes: Number(row.dislikes), reaction: row.mine as Reaction | null };
}
// Recheck visibility at the time of every read/write; hidden parents cannot be accessed by ID.
function visibleComment(userId: string, topicId: string, commentId: string): boolean {
  return validId(topicId) && validId(commentId) && !!getDatabase().prepare(`SELECT 1 FROM comments WHERE topic_id=? AND id=? AND (EXISTS(SELECT 1 FROM entitlements WHERE user_id=? AND topic_id=?) OR id IN (SELECT id FROM comments WHERE topic_id=? ORDER BY created_at DESC,id DESC LIMIT 3))`).get(topicId, commentId, userId, topicId, topicId);
}

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
    const comments: Comment[] = rows.map(row => ({ id: String(row.id), authorLabel: String(row.author_label), body: String(row.body), isSynthetic: row.is_synthetic === 1, createdAt: Number(row.created_at), ...reactions(user.id, String(row.id)), replyCount: Number(db.prepare("SELECT count(*) AS n FROM comment_replies WHERE comment_id=?").get(String(row.id))?.n) }));
    return success({ topicId, comments, totalCount, unlocked });
  });
}

export async function getCommentReplies(topicId: string, commentId: string) {
  return databaseResult<CommentReply[]>(async () => {
    const user = await getCurrentDemoUser();
    if (!visibleComment(user.id, topicId, commentId)) return failure("NOT_FOUND", "This post is not available in your current preview.");
    const rows = getDatabase().prepare("SELECT id,author_label,body,created_at FROM comment_replies WHERE comment_id=? ORDER BY created_at,rowid").all(commentId);
    return success(rows.map(row => ({ id: String(row.id), authorLabel: String(row.author_label), body: String(row.body), createdAt: Number(row.created_at), ...reactions(user.id, String(row.id), true) })));
  });
}
export async function addCommentReply(topicId: string, commentId: string, body: string) {
  return databaseResult<CommentReply[]>(async () => {
    if (typeof body !== "string" || !body.trim() || body.length > 1000) return failure("VALIDATION", "Write a comment of 1–1,000 characters.");
    const user = await getCurrentDemoUser();
    const written = transaction(getDatabase(), () => {
      if (!visibleComment(user.id, topicId, commentId)) return false;
      getDatabase().prepare("INSERT INTO comment_replies(id,comment_id,user_id,author_label,body,created_at) VALUES (?,?,?,?,?,?)").run(randomUUID(), commentId, user.id, user.demoName, body.trim(), Date.now());
      return true;
    });
    if (!written) return failure("NOT_FOUND", "This post is not available in your current preview.");
    return getCommentReplies(topicId, commentId);
  });
}
// Desired-state writes make duplicate submissions idempotent; NONE cancels the current vote.
export async function setCommentReaction(topicId: string, commentId: string, reaction: Reaction | "NONE", replyId?: string) {
  return databaseResult<ReactionSummary>(async () => {
    if (!["LIKE", "DISLIKE", "NONE"].includes(reaction)) return failure("VALIDATION", "Choose Like or Dislike.");
    const user = await getCurrentDemoUser();
    return transaction(getDatabase(), () => {
      if (!visibleComment(user.id, topicId, commentId)) return failure("NOT_FOUND", "This post is not available in your current preview.");
      if (replyId !== undefined && (!validId(replyId) || !getDatabase().prepare("SELECT 1 FROM comment_replies WHERE id=? AND comment_id=?").get(replyId, commentId))) return failure("NOT_FOUND", "Comment not found.");
      const id = replyId ?? commentId, column = replyId === undefined ? "comment_id" : "reply_id";
      if (reaction === "NONE") getDatabase().prepare(`DELETE FROM comment_reactions WHERE user_id=? AND ${column}=?`).run(user.id, id);
      else getDatabase().prepare(`INSERT INTO comment_reactions(user_id,${column},reaction,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,${column}) DO UPDATE SET reaction=excluded.reaction,updated_at=excluded.updated_at`).run(user.id, id, reaction, Date.now());
      return success(reactions(user.id, id, replyId !== undefined));
    });
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
