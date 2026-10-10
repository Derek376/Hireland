"use server";

import { revalidatePath } from "next/cache";
import type { Category } from "../shared/contracts.ts";
import type { FormState } from "../shared/form-state.ts";
import { clearProfile, saveProfile } from "../server/profile.ts";

export async function profileAction(_previous: FormState, data: FormData): Promise<FormState> {
  const intent = data.get("intent");
  if (intent !== "save" && intent !== "clear") return { status: "error", message: "Choose a valid profile action." };
  const result = intent === "clear" ? await clearProfile() : await saveProfile({ cvText: String(data.get("cvText") ?? ""), preferences: data.getAll("preferences").map(String) as Category[] });
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath("/profile");
  revalidatePath("/");
  return { status: "success", message: intent === "clear" ? "Saved profile and related assessments cleared." : "Profile saved locally. You're ready to explore jobs." };
}
