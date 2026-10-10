"use server";
import { revalidatePath } from "next/cache";
import type { AssessmentState } from "../shared/assessment-state.ts";
import { validId } from "../server/results.ts";
import { assessJob } from "../server/assessments.ts";

export async function assessJobAction(_previous: AssessmentState, data: FormData): Promise<AssessmentState> {
  if (data.get("consent") !== "yes") return { assessment: null, message: "Confirm that you want to send your saved CV and this job to OpenRouter.", retryable: false, failed: true };
  const jobId = String(data.get("jobId") ?? "");
  const result = await assessJob(jobId);
  if (validId(jobId)) revalidatePath(`/jobs/${jobId}`);
  if (!result.ok) return { assessment: null, message: result.error.message, retryable: result.error.retryable, failed: true };
  return { assessment: result.value, message: result.value.cached ? "Showing a saved assessment for these exact inputs. No new AI request." : "Assessment verified and saved locally.", retryable: false, failed: false };
}
