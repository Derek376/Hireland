import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase, getDatabase } from "../src/server/db.ts";
import { seedJobs, seedCommunity } from "../src/server/seed.ts";
import { getWorkspaceData } from "../src/server/workspace.ts";
import { saveApplication, updateApplication } from "../src/server/applications.ts";
import { addComment } from "../src/server/community.ts";

test("Reference UI data: only authorized comments are serialized; reads create no provider work", async t => {
  const directory = mkdtempSync(join(tmpdir(), "hireland-ui-"));
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(directory, "test.sqlite");
  try {
    seedJobs(); seedCommunity();
    await t.test("workspace excludes every hidden comment body and has no fabricated scores", async () => {
      const result = await getWorkspaceData();
      assert.ok(result.ok);
      assert.equal(result.value.jobs.length, 10);
      for (const row of result.value.jobs) {
        assert.equal(row.topic?.comments.length, 3);
        assert.equal(row.topic?.totalCount, 6);
        assert.equal(row.assessment, null);
        const hidden = getDatabase().prepare("SELECT body FROM comments WHERE topic_id=? ORDER BY created_at,id LIMIT 3").all(row.topic!.topicId);
        for (const comment of hidden) assert.equal(JSON.stringify(row).includes(String(comment.body)), false);
      }
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM purchases").get()?.n, 0);
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM assessments").get()?.n, 0);
    });
    await t.test("tracker stages and new preview posts come from persisted records", async () => {
      const saved = await saveApplication("job-01"); assert.ok(saved.ok);
      const updated = await updateApplication(saved.value.id, "INTERVIEW"); assert.ok(updated.ok);
      const posted = await addComment("topic-job-01", "Fictional UI test: preparing interview examples."); assert.ok(posted.ok);
      const result = await getWorkspaceData(); assert.ok(result.ok);
      const row = result.value.jobs.find(item => item.job.id === "job-01")!;
      assert.equal(row.application?.status, "INTERVIEW");
      assert.equal(row.topic?.comments[0].body, "Fictional UI test: preparing interview examples.");
      assert.equal(row.topic?.comments.length, 3);
      assert.equal(row.topic?.totalCount, 7);
    });
  } finally {
    closeDatabase();
    if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
