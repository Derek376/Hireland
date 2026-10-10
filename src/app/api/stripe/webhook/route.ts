import { revalidatePath } from "next/cache";
import { processStripeWebhook } from "@/server/stripe-webhook";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") || !process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) return new Response("Sandbox webhook not configured.", { status: 503 });
  const reader = request.body?.getReader();
  if (!reader) return new Response("Missing body.", { status: 400 });
  const chunks: Uint8Array[] = []; let bytes = 0;
  try { while (true) { const chunk = await reader.read(); if (chunk.done) break; bytes += chunk.value.byteLength; if (bytes > 65536) { await reader.cancel(); return new Response("Body too large.", { status: 413 }); } chunks.push(chunk.value); } } finally { reader.releaseLock(); }
  const body = Buffer.concat(chunks).toString("utf8");
  const result = await processStripeWebhook(body, request.headers.get("stripe-signature") ?? "");
  if (result.status === 200) revalidatePath("/topics/[topicId]", "page");
  return new Response(result.message, { status: result.status });
}
