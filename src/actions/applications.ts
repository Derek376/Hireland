"use server";

import { revalidatePath } from "next/cache";
import type { ApplicationStatus } from "../shared/contracts.ts";
import type { FormState } from "../shared/form-state.ts";
import { deleteApplication, saveApplication, updateApplication } from "../server/applications.ts";

export async function saveApplicationAction(_previous: FormState, data: FormData): Promise<FormState> {
  const jobId = String(data.get("jobId") ?? "");
  const result = await saveApplication(jobId);
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath("/");
  revalidatePath("/applications");
  revalidatePath(`/jobs/${jobId}`);
  return { status: "success", message: "Saved to your tracker. No application was sent." };
}
export async function updateApplicationAction(_previous: FormState, data: FormData): Promise<FormState> {
  const result = await updateApplication(String(data.get("applicationId") ?? ""), String(data.get("status") ?? "") as ApplicationStatus);
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath("/");
  revalidatePath("/applications");
  revalidatePath(`/jobs/${result.value.jobId}`);
  return { status: "success", message: "Application status updated." };
}
export async function deleteApplicationAction(_previous: FormState, data: FormData): Promise<FormState> {
  const result = await deleteApplication(String(data.get("applicationId") ?? ""));
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath("/");
  revalidatePath("/applications");
  revalidatePath("/jobs/[jobId]", "page");
  return { status: "success", message: "Removed from your tracker." };
}
