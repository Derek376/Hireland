import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { closeDatabase, getDatabase } from "../src/server/db.ts";
import { seedJobs, seedCommunity, seedPublicJobs } from "../src/server/seed.ts";
import { getJob, listJobs } from "../src/server/jobs.ts";
import { getTopicForJob, getTopicComments, addComment } from "../src/server/community.ts";
import { saveApplication, updateApplication, listApplicationHistory } from "../src/server/applications.ts";
import type { Result } from "../src/shared/contracts.ts";
const value = <T>(result: Result<T>): T => { assert.ok(result.ok); return result.value; };

test("Public Stripe job preserves provenance, dates, local records and an empty community", async t => {
  const directory = mkdtempSync(join(tmpdir(), "hireland-public-job-"));
  const previous = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = join(directory, "test.sqlite");
  try {
    seedJobs(); seedCommunity();
    await t.test("public import adds the verified role and separates the assigned date from publication", async () => {
      assert.deepEqual(seedPublicJobs(), { inserted: 1 });
      const job = value(await getJob("stripe-8130881"));
      assert.equal(job.company, "Stripe");
      assert.equal(job.title, "Software Engineer, New Grad");
      assert.equal(job.sourceType, "public");
      assert.equal(job.applyUrl, "https://stripe.com/careers/listing/software-engineer-new-grad/8130881");
      assert.equal(job.sourceUrl, job.applyUrl);
      assert.equal(job.listedAt, Date.UTC(2026, 9, 10));
      assert.equal(job.publishedAt, null);
      assert.equal(value(await listJobs()).length, 11);
    });
    await t.test("public discussion starts empty, including after fictional community seed", async () => {
      const topic = value(await getTopicForJob("stripe-8130881"));
      seedCommunity();
      assert.equal(value(await getTopicComments(topic.id)).comments.length, 0);
      assert.equal(value(await getTopicComments(topic.id)).totalCount, 0);
      assert.equal(getDatabase().prepare("SELECT count(*) AS n FROM comments WHERE is_synthetic=1").get()?.n, 60);
    });
    await t.test("repeat import preserves local edits, posts, applications and logs without duplication", async () => {
      const app = value(await saveApplication("stripe-8130881"));
      value(await updateApplication(app.id, "APPLIED"));
      const topic = value(await getTopicForJob("stripe-8130881"));
      value(await addComment(topic.id, "Fictional test: reviewing the official role."));
      const history = value(await listApplicationHistory());
      getDatabase().prepare("UPDATE jobs SET description='Locally edited summary' WHERE id='stripe-8130881'").run();
      assert.deepEqual(seedPublicJobs(), { inserted: 0 });
      assert.equal(value(await getJob("stripe-8130881")).description, "Locally edited summary");
      assert.equal(value(await saveApplication("stripe-8130881")).status, "APPLIED");
      assert.deepEqual(value(await listApplicationHistory()), history);
      assert.equal(value(await getTopicComments(topic.id)).totalCount, 1);
      closeDatabase();
      assert.equal(value(await getJob("stripe-8130881")).listedAt, Date.UTC(2026, 9, 10));
      assert.equal(value(await listJobs()).length, 11);
    });
  } finally {
    closeDatabase();
    if (previous === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = previous;
    rmSync(directory, { recursive: true, force: true });
  }
});
