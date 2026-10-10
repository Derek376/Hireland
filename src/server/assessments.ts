import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { Assessment, Result } from "../shared/contracts.ts";
import { getDatabase } from "./db.ts";
import { getJob } from "./jobs.ts";
import { getProfile } from "./profile.ts";
import { getCurrentDemoUser } from "./identity.ts";
import { databaseResult, failure, success } from "./results.ts";
import { PROMPT_VERSION, validateAssessmentOutput } from "./assessment-output.ts";
import { openRouterConfig, requestAssessment, type AssessmentInput, type OpenRouterConfig } from "./providers/openrouter.ts";

interface Context { userId: string; jobId: string; input: AssessmentInput; hash: string; revision: number; modelId: string }
interface CacheRow { id: string; result_json: string; created_at: number }
export interface AssessmentView { key: string; profileReady: boolean; configured: boolean; assessment: Assessment | null }
interface Coordinator { active: Map<string, { key: string; promise: Promise<Result<Assessment>> }>; failures: Map<string, number> }
const globalState = globalThis as typeof globalThis & { hirelandAssessmentCoordinator?: Coordinator };
const coordinator = globalState.hirelandAssessmentCoordinator ??= { active: new Map(), failures: new Map() };
export const assessmentInputHash = (input: AssessmentInput, modelId: string): string => createHash("sha256").update(JSON.stringify({ input, modelId, promptVersion: PROMPT_VERSION })).digest("hex");

async function context(jobId: string, modelId: string): Promise<Result<Context>> {
  const [job, profile, user] = await Promise.all([getJob(jobId), getProfile(), getCurrentDemoUser()]);
  if (!job.ok) return job;
  if (!profile.ok) return profile;
  if (!profile.value || !profile.value.cvText.trim()) return failure("VALIDATION", "Save your CV and career preferences in Profile before analysing a job.");
  const { cvText, preferences, updatedAt } = profile.value;
  if (cvText.length > 12000 || !preferences.length || !job.value.description.trim() || job.value.description.length > 20000) return failure("VALIDATION", "Your saved CV or job description is missing or too long. Review the inputs before analysing.");
  const { title, company, location, category, description, status, sourceType } = job.value;
  const input: AssessmentInput = { cvText, preferences, job: { title, company, location, category, description: description.trim().replace(/\r\n?/g, "\n"), status, sourceType } };
  return success({ userId: user.id, jobId, input, hash: assessmentInputHash(input, modelId), revision: updatedAt, modelId });
}
function cached(ctx: Context): Assessment | null {
  const row = getDatabase().prepare("SELECT id,result_json,created_at FROM assessments WHERE user_id=? AND job_id=? AND input_hash=? AND prompt_version=? AND model_id=?").get(ctx.userId, ctx.jobId, ctx.hash, PROMPT_VERSION, ctx.modelId) as CacheRow | undefined;
  if (!row) return null;
  try {
    const result = validateAssessmentOutput(JSON.parse(row.result_json), ctx.input.cvText, ctx.input.job.description);
    return result.ok ? { id: row.id, jobId: ctx.jobId, modelId: ctx.modelId, promptVersion: PROMPT_VERSION, createdAt: row.created_at, cached: true, output: result.value } : null;
  } catch { return null; }
}
export async function getAssessmentView(jobId: string): Promise<Result<AssessmentView>> {
  return databaseResult<AssessmentView>(async () => {
    const config = openRouterConfig();
    const ctx = await context(jobId, config?.modelId ?? "unconfigured");
    if (!ctx.ok) {
      if (ctx.error.code === "VALIDATION") return success({ key: "no-profile", profileReady: false, configured: !!config, assessment: null });
      return ctx;
    }
    return success({ key: `${ctx.value.hash}:${ctx.value.revision}`, profileReady: true, configured: !!config, assessment: config ? cached(ctx.value) : null });
  });
}

// The factory keeps tests isolated; production has one process-wide coordinator for this single-instance demo.
export function createAssessmentService(provider = requestAssessment, configReader: () => OpenRouterConfig | null = openRouterConfig, state: Coordinator = { active: new Map(), failures: new Map() }) {
  return async function assess(jobId: string): Promise<Result<Assessment>> {
    return databaseResult(async () => {
      const config = configReader();
      const loaded = await context(jobId, config?.modelId ?? "unconfigured");
      if (!loaded.ok) return loaded;
      if (!config) return failure("NOT_CONFIGURED", "AI is not configured. Set OPENROUTER_API_KEY and OPENROUTER_MODEL on the server; your CV was not sent.");
      const ctx = loaded.value;
      const existing = cached(ctx);
      if (existing) return success(existing);
      const failureKey = `${ctx.userId}:${ctx.jobId}:${ctx.hash}`;
      const key = `${failureKey}:${ctx.revision}`;
      const active = state.active.get(ctx.userId);
      if (active) return active.key === key ? active.promise : failure("BUSY", "Another assessment is running. Wait for it to finish before analysing a different input.", true);
      if ((state.failures.get(failureKey) ?? 0) >= 2) return failure("PROVIDER_ERROR", "Both attempts failed for these inputs. Check the provider configuration before restarting the local app to try again.");
      const work = databaseResult(async () => {
        const response = await provider(ctx.input, config);
        const validated = response.ok ? validateAssessmentOutput(response.value, ctx.input.cvText, ctx.input.job.description) : response;
        if (!validated.ok) {
          const attempts = (state.failures.get(failureKey) ?? 0) + 1;
          state.failures.set(failureKey, attempts);
          if (state.failures.size > 128) state.failures.delete(state.failures.keys().next().value!);
          return { ok: false, error: { ...validated.error, retryable: validated.error.retryable && attempts < 2, message: validated.error.message + (attempts >= 2 ? " Both attempts failed; check configuration before restarting the local app." : "") } } as Result<never>;
        }
        // A CV clear/edit or model change during HTTP must not resurrect deleted or obsolete results.
        const latest = await context(jobId, configReader()?.modelId ?? "unconfigured");
        if (!latest.ok || latest.value.hash !== ctx.hash || latest.value.revision !== ctx.revision) return failure("VALIDATION", "Your inputs changed during analysis. Refresh this page and analyse the saved profile again.");
        const assessment: Assessment = { id: randomUUID(), jobId, modelId: ctx.modelId, promptVersion: PROMPT_VERSION, createdAt: Date.now(), cached: false, output: validated.value };
        getDatabase().prepare("INSERT INTO assessments VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(user_id,job_id,input_hash,prompt_version,model_id) DO UPDATE SET id=excluded.id,result_json=excluded.result_json,created_at=excluded.created_at")
          .run(assessment.id, ctx.userId, jobId, ctx.hash, PROMPT_VERSION, ctx.modelId, JSON.stringify(assessment.output), assessment.createdAt);
        state.failures.delete(failureKey);
        return success(assessment);
      });
      state.active.set(ctx.userId, { key, promise: work });
      try { return await work; }
      finally { if (state.active.get(ctx.userId)?.promise === work) state.active.delete(ctx.userId); }
    });
  };
}
export const assessJob = createAssessmentService(requestAssessment, openRouterConfig, coordinator);
