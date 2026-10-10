import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Result, Reaction } from "../src/shared/contracts.ts";
import { closeDatabase, getDatabase } from "../src/server/db.ts";
import { seedJobs, seedCommunity } from "../src/server/seed.ts";
import { addComment, addCommentReply, getCommentReplies, getTopicComments, setCommentReaction } from "../src/server/community.ts";
import { getWorkspaceData } from "../src/server/workspace.ts";

function value<T>(result: Result<T>): T { assert.ok(result.ok); return result.value; }
function fail<T>(result: Result<T>, code: string) { assert.equal(result.ok, false); if (!result.ok) assert.equal(result.error.code, code); }

test("Comment interactions: mutually exclusive votes, real reply relationships and preview boundaries", async t => {
  const directory = mkdtempSync(join(tmpdir(), "hireland-comment-"));
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(directory, "test.sqlite");
  try {
    seedJobs(); seedCommunity();
    const topicId = "topic-job-01";
    const original = value(await getTopicComments(topicId));
    const parent = original.comments[0].id;
    let replyId = "";
    await t.test("old posts start at zero with no fictional reactions or replies", async () => {
      assert.equal(original.totalCount, 6);
      for (const post of original.comments) {
        assert.equal(post.likes, 0); assert.equal(post.dislikes, 0); assert.equal(post.reaction, null); assert.equal(post.replyCount, 0);
      }
      assert.deepEqual(value(await getCommentReplies(topicId, parent)), []);
    });
    await t.test("LIKE/DISLIKE switch, repeated desired states are idempotent, NONE cancels", async () => {
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "LIKE")), { likes: 1, dislikes: 0, reaction: "LIKE" });
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "LIKE")), { likes: 1, dislikes: 0, reaction: "LIKE" });
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "DISLIKE")), { likes: 0, dislikes: 1, reaction: "DISLIKE" });
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "DISLIKE")), { likes: 0, dislikes: 1, reaction: "DISLIKE" });
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "NONE")), { likes: 0, dislikes: 0, reaction: null });
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "NONE")), { likes: 0, dislikes: 0, reaction: null });
    });
    await t.test("other users' reactions are counted but never overwritten or cancelled", async () => {
      getDatabase().prepare("INSERT INTO users VALUES ('other-comment-user','Other')").run();
      getDatabase().prepare("INSERT INTO comment_reactions(user_id,comment_id,reaction,updated_at) VALUES ('other-comment-user',?,'LIKE',1)").run(parent);
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "DISLIKE")), { likes: 1, dislikes: 1, reaction: "DISLIKE" });
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "NONE")), { likes: 1, dislikes: 0, reaction: null });
      assert.equal(getDatabase().prepare("SELECT reaction FROM comment_reactions WHERE user_id='other-comment-user'").get()?.reaction, "LIKE");
    });
    await t.test("comments attach to one post, preserve root ordering/count and use server identity", async () => {
      const rootsBefore = value(await getTopicComments(topicId)).comments.map(post => post.id);
      const first = value(await addCommentReply(topicId, parent, "  Fictional first reply  "));
      replyId = first[0].id;
      const second = value(await addCommentReply(topicId, parent, "Fictional second reply"));
      assert.deepEqual(second.map(reply => reply.body), ["Fictional first reply", "Fictional second reply"]);
      assert.equal(second[0].authorLabel, "Demo Student");
      const posts = value(await getTopicComments(topicId));
      assert.equal(posts.totalCount, 6); assert.equal(posts.comments.length, 3);
      assert.deepEqual(posts.comments.map(post => post.id), rootsBefore);
      assert.equal(posts.comments[0].replyCount, 2);
      assert.deepEqual(value(await getCommentReplies(topicId, posts.comments[1].id)), []);
      assert.equal(getDatabase().prepare("SELECT user_id FROM comment_replies WHERE id=?").get(replyId)?.user_id, "demo-user");
    });
    await t.test("reply votes are separate; IDs must belong to the supplied post and topic", async () => {
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "LIKE", replyId)), { likes: 1, dislikes: 0, reaction: "LIKE" });
      assert.deepEqual(value(await setCommentReaction(topicId, parent, "DISLIKE", replyId)), { likes: 0, dislikes: 1, reaction: "DISLIKE" });
      const another = original.comments[1].id;
      fail(await setCommentReaction(topicId, another, "LIKE", replyId), "NOT_FOUND");
      fail(await setCommentReaction("topic-job-02", parent, "LIKE"), "NOT_FOUND");
      fail(await addCommentReply("topic-job-02", parent, "Fictional misplaced reply"), "NOT_FOUND");
      fail(await setCommentReaction(topicId, parent, "INVALID" as Reaction), "VALIDATION");
      fail(await getCommentReplies(topicId, "../missing"), "NOT_FOUND");
      for (const body of [" ", "x".repeat(1001)]) fail(await addCommentReply(topicId, parent, body), "VALIDATION");
      assert.equal(value(await getCommentReplies(topicId, parent)).length, 2);
      const root = value(await getTopicComments(topicId)).comments[0]; assert.equal(root.likes, 1); assert.equal(root.dislikes, 0);
    });
    await t.test("replies and votes survive reopened database without reseeding or provider work", async () => {
      closeDatabase();
      const replies = value(await getCommentReplies(topicId, parent));
      assert.equal(replies.length, 2); assert.equal(replies[0].reaction, "DISLIKE");
      assert.equal(value(await getTopicComments(topicId)).comments[0].replyCount, 2);
      const workspace = value(await getWorkspaceData());
      assert.equal(JSON.stringify(workspace).includes("Fictional first reply"), false);
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM purchases").get()?.n, 0);
    });
    await t.test("a parent leaving free preview hides all its replies and rejects reads/writes", async () => {
      for (let i = 0; i < 3; i++) value(await addComment(topicId, `Fictional newer post ${i}`));
      const posts = value(await getTopicComments(topicId)); assert.equal(posts.comments.length, 3); assert.equal(posts.comments.some(post => post.id === parent), false);
      assert.equal(JSON.stringify(posts).includes("Fictional first reply"), false);
      fail(await getCommentReplies(topicId, parent), "NOT_FOUND");
      fail(await addCommentReply(topicId, parent, "Fictional hidden attempt"), "NOT_FOUND");
      fail(await setCommentReaction(topicId, parent, "LIKE"), "NOT_FOUND");
      fail(await setCommentReaction(topicId, parent, "LIKE", replyId), "NOT_FOUND");
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM comment_replies WHERE comment_id=?").get(parent)?.n, 2);
      getDatabase().prepare("INSERT INTO purchases VALUES ('offline-access','demo-user',?,99,'eur','cs_test_offline_access','PAID',1,1)").run(topicId);
      getDatabase().prepare("INSERT INTO entitlements VALUES ('demo-user',?,'offline-access',1)").run(topicId);
      assert.equal(value(await getCommentReplies(topicId, parent)).length, 2);
      assert.ok(value(await getTopicComments(topicId)).unlocked);
      assert.equal(value(await setCommentReaction(topicId, parent, "LIKE")).likes, 2);
    });
    await t.test("write failures preserve existing vote; foreign keys clean replies and votes with their parent", async () => {
      getDatabase().exec("CREATE TRIGGER simulated_vote_failure BEFORE INSERT ON comment_reactions BEGIN SELECT RAISE(ABORT,'SIMULATED failure'); END");
      fail(await setCommentReaction(topicId, parent, "DISLIKE"), "PERSISTENCE_ERROR");
      getDatabase().exec("DROP TRIGGER simulated_vote_failure");
      assert.equal(value(await getTopicComments(topicId)).comments.find(post => post.id === parent)?.reaction, "LIKE");
      getDatabase().prepare("DELETE FROM comments WHERE id=?").run(parent);
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM comment_replies WHERE comment_id=?").get(parent)?.n, 0);
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM comment_reactions WHERE comment_id=? OR reply_id=?").get(parent, replyId)?.n, 0);
    });
  } finally {
    closeDatabase(); if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
