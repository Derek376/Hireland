import "server-only";
import type Stripe from "stripe";
import { fulfillSignedCheckout } from "./billing.ts";
import { verifyStripeEvent } from "./providers/stripe.ts";

export async function processStripeWebhook(body: string, signature: string, verify = verifyStripeEvent, fulfill = fulfillSignedCheckout): Promise<{ status: number; message: string }> {
  let event: Stripe.Event;
  try { event = verify(body, signature); } catch { return { status: 400, message: "Invalid Stripe signature." }; }
  if (event.livemode) return { status: 400, message: "Sandbox events only." };
  if (!["checkout.session.completed", "checkout.session.expired"].includes(event.type)) return { status: 200, message: "Ignored event." };
  const session = event.data.object as Stripe.Checkout.Session;
  const result = await fulfill(session.id);
  if (!result.ok) return { status: result.error.code === "NOT_FOUND" ? 200 : 500, message: result.error.code === "NOT_FOUND" ? "Unrelated checkout ignored." : "Confirmation failed; retry event." };
  return { status: 200, message: "Event processed." };
}
