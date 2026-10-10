"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "../shared/form-state.ts";
import { addComment } from "../server/community.ts";
import { createCheckout, recoverTopic } from "../server/billing.ts";

export async function addCommentAction(_state: FormState, data: FormData): Promise<FormState> {
  const topicId = String(data.get("topicId") ?? "");
  const result = await addComment(topicId, String(data.get("body") ?? ""));
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath(`/topics/${topicId}`);
  return { status: "success", message: "Comment saved. Only the latest three comments are visible until this discussion is unlocked." };
}
export async function checkoutAction(_state: FormState, data: FormData): Promise<FormState> {
  const result = await createCheckout(String(data.get("topicId") ?? ""));
  if (!result.ok) return { status: "error", message: result.error.message };
  redirect(result.value.url);
}
export async function recoverPaymentAction(_state: FormState, data: FormData): Promise<FormState> {
  const topicId = String(data.get("topicId") ?? "");
  const result = await recoverTopic(topicId);
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath(`/topics/${topicId}`);
  return { status: "success", message: result.value.status === "UNLOCKED" ? "Stripe payment confirmed. Discussion unlocked." : "No paid checkout found yet. No access granted or new charge created." };
}
