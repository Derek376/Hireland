"use server";

import { revalidatePath } from "next/cache";
import type { Category } from "../shared/contracts.ts";
import type { FormState } from "../shared/form-state.ts";
import { clearProfile, saveProfile } from "../server/profile.ts";
import { uploadCv } from "../server/cv-upload.ts";

export async function uploadCvAction(data: FormData): Promise<FormState> {
  const file = data.get("cvFile");
  if (!(file instanceof File)) return { status: "error", message: "Choose a CV attachment to upload." };
  const result = await uploadCv(file);
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath("/profile");
  revalidatePath("/jobs/[jobId]", "page");
  revalidatePath("/");
  revalidatePath("/applications");
  return { status: "success", message: "CV updated. Analyse this role to check the new match." };
}

export async function profileAction(_previous: FormState, data: FormData): Promise<FormState> {
  const intent = data.get("intent");
  if (intent !== "save" && intent !== "clear") return { status: "error", message: "Choose a valid profile action." };
  const result = intent === "clear" ? await clearProfile() : await saveProfile({ cvText: String(data.get("cvText") ?? ""), preferences: data.getAll("preferences").map(String) as Category[] });
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath("/profile");
  revalidatePath("/jobs/[jobId]", "page");
  revalidatePath("/");
  revalidatePath("/applications");
  return { status: "success", message: intent === "clear" ? "Saved profile and related assessments cleared." : "Profile saved locally. You're ready to explore jobs." };
}
