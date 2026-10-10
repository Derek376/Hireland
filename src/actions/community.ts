"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { FormState } from "../shared/form-state.ts";
import { addComment, addCommentReply, setCommentReaction } from "../server/community.ts";
import type { Reaction } from "../shared/contracts.ts";
import { createCheckout, recoverTopic } from "../server/billing.ts";

function refreshCommunity(topicId: string) {
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/");
  revalidatePath("/applications");
}
export async function commentReactionAction(_state: FormState, data: FormData): Promise<FormState> {
  const topicId = String(data.get("topicId") ?? "");
  const reaction = String(data.get("reaction") ?? "") as Reaction | "NONE";
  const replyId = data.get("replyId");
  const result = await setCommentReaction(topicId, String(data.get("commentId") ?? ""), reaction, replyId === null ? undefined : String(replyId));
  if (!result.ok) return { status: "error", message: result.error.message };
  refreshCommunity(topicId);
  return { status: "success", message: reaction === "NONE" ? "Reaction removed." : reaction === "LIKE" ? "Like saved." : "Dislike saved." };
}
export async function addCommentReplyAction(_state: FormState, data: FormData): Promise<FormState> {
  const topicId = String(data.get("topicId") ?? "");
  const result = await addCommentReply(topicId, String(data.get("commentId") ?? ""), String(data.get("body") ?? ""));
  if (!result.ok) return { status: "error", message: result.error.message };
  refreshCommunity(topicId);
  return { status: "success", message: "Comment posted below this post." };
}

export async function addCommentAction(_state: FormState, data: FormData): Promise<FormState> {
  const topicId = String(data.get("topicId") ?? "");
  const result = await addComment(topicId, String(data.get("body") ?? ""));
  if (!result.ok) return { status: "error", message: result.error.message };
  revalidatePath(`/topics/${topicId}`);
  revalidatePath("/");
  revalidatePath("/applications");
  return { status: "success", message: result.value.unlocked ? "Post saved to this discussion." : "Post saved. Your free preview shows the latest three posts." };
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
  revalidatePath("/");
  revalidatePath("/applications");
  return { status: "success", message: result.value.status === "UNLOCKED" ? "Stripe payment confirmed. Discussion unlocked." : "No paid checkout found yet. No access granted or new charge created." };
}
