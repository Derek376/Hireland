// Real product-path validation. No offline transport, no demo database writes, fictional inputs only.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { Category, Job } from "../src/shared/contracts.ts";
import { createAssessmentService } from "../src/server/assessments.ts";
import { closeDatabase, getDatabase } from "../src/server/db.ts";
import { seedJobs } from "../src/server/seed.ts";
import { saveProfile } from "../src/server/profile.ts";
import { openRouterConfig, requestAssessment } from "../src/server/providers/openrouter.ts";
import { PROMPT_VERSION, validateAssessmentOutput } from "../src/server/assessment-output.ts";

if (!openRouterConfig()) { console.log("BLOCKED: Configure OPENROUTER_API_KEY and OPENROUTER_MODEL in ignored .env.local. No request sent."); process.exit(2); }
const directory = mkdtempSync(join(tmpdir(), "hireland-m2-real-"));
const oldPath = process.env.DATABASE_PATH;
process.env.DATABASE_PATH = join(directory, "evaluation.sqlite");
const source = readFileSync(new URL("../data/evaluation/scenarios.json", import.meta.url), "utf8");
const cases = JSON.parse(source) as { id: string; cvText: string; preferences: Category[]; job: Job; humanReviewCriteria: string[] }[];
const results: object[] = [];
const assessJob = createAssessmentService(async (input, config) => {
  const response = await requestAssessment(input, config);
  if (response.ok && !validateAssessmentOutput(response.value, input.cvText, input.job.description).ok) {
    const raw = response.value as Record<string, unknown>;
    const summarize = (points: unknown) => Array.isArray(points) ? points.map(p => ({ reasonLength: p?.reason?.length, cvQuoteLength: p?.cvQuote?.length, cvExact: p?.cvQuote === null || (typeof p?.cvQuote === "string" && input.cvText.includes(p.cvQuote)), jdQuoteLength: p?.jdQuote?.length, jdExact: typeof p?.jdQuote === "string" && input.job.description.includes(p.jdQuote) })) : "not-an-array";
    console.log("Invalid output diagnostics (no input text): " + JSON.stringify({ keysValid: !!raw && Object.keys(raw).sort().join(",") === "decision,gaps,reason,score,strengths,unknowns", decisionValid: ["YES", "NO", "NEEDS_REVIEW"].includes(String(raw?.decision)), score: typeof raw?.score === "number" ? raw.score : raw?.score === null ? null : "invalid-type", reasonLength: typeof raw?.reason === "string" ? raw.reason.length : null, strengths: summarize(raw?.strengths), gaps: summarize(raw?.gaps), unknownLengths: Array.isArray(raw?.unknowns) ? raw.unknowns.map(v => typeof v === "string" ? v.length : "invalid-type") : "not-an-array" }));
  }
  return response;
});
let failed = false;
try {
  await seedJobs();
  for (const scenario of cases) {
    const profile = await saveProfile({ cvText: scenario.cvText, preferences: scenario.preferences });
    if (!profile.ok) throw new Error("Fictional profile fixture failed validation");
    getDatabase().prepare("UPDATE jobs SET description=? WHERE id=?").run(scenario.job.description, scenario.job.id);
    const result = await assessJob(scenario.job.id);
    if (!result.ok) {
      failed = true;
      results.push({ scenarioId: scenario.id, status: "FAILED", error: result.error, reviewCriteria: scenario.humanReviewCriteria });
      console.log(`${scenario.id}: FAILED (${result.error.code}). No automatic retry.`);
      continue;
    }
    const repeat = await assessJob(scenario.job.id);
    if (!repeat.ok || !repeat.value.cached || repeat.value.id !== result.value.id) throw new Error("Real product cache verification failed");
    results.push({ scenarioId: scenario.id, status: "REAL_RESPONSE_VALIDATED", assessment: result.value, cachedRepeatVerified: true, reviewCriteria: scenario.humanReviewCriteria, humanReview: "PENDING" });
    console.log(`${scenario.id}: REAL_RESPONSE_VALIDATED; decision=${result.value.output.decision}; exact quotes checked; repeat served from cache. Human review required.`);
  }
  if (process.argv.includes("--write-evidence")) {
    const evidencePath = new URL("../Doc/evidence/M2_REAL_RESULTS.json", import.meta.url);
    if (existsSync(evidencePath)) {
      const previous = readFileSync(evidencePath, "utf8");
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      writeFileSync(new URL(`../Doc/evidence/M2_REAL_ARCHIVE_${stamp}.json`, import.meta.url), previous);
    }
    writeFileSync(evidencePath, JSON.stringify({ recordedAt: new Date().toISOString(), source: "Real OpenRouter via assessJob; isolated temporary SQLite; fictional inputs only", fixtureFile: "data/evaluation/scenarios.json", fixtureSha256: createHash("sha256").update(source).digest("hex"), promptVersion: PROMPT_VERSION, complete: !failed && results.length === cases.length, results }, null, 2) + "\n");
    console.log("Evidence written to Doc/evidence/M2_REAL_RESULTS.json. It contains only synthetic material and result metadata, no keys.");
  }
  process.exitCode = failed ? 1 : 0;
} catch {
  console.log("FAILED: Local evaluation could not complete. No raw error or CV was logged."); process.exitCode = 1;
} finally {
  closeDatabase();
  if (oldPath === undefined) delete process.env.DATABASE_PATH; else process.env.DATABASE_PATH = oldPath;
  rmSync(directory, { recursive: true, force: true });
}
