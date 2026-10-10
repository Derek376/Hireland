import "server-only";
import Stripe from "stripe";

export interface PurchaseInput { id: string; user_id: string; topic_id: string; created_at: number }
export interface StripeProvider {
  create(purchase: PurchaseInput): Promise<Stripe.Checkout.Session>;
  retrieve(sessionId: string): Promise<Stripe.Checkout.Session>;
}
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  return key?.startsWith("sk_test_") ? new Stripe(key, { timeout: 20000, maxNetworkRetries: 1 }) : null;
}
export function appOrigin(): string {
  const url = new URL(process.env.APP_URL || "http://127.0.0.1:3000");
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== "http:" || url.username || url.password) throw new Error("Set APP_URL to the local application origin.");
  return url.origin;
}
export function stripeProvider(): StripeProvider | null {
  const stripe = stripeClient();
  if (!stripe) return null;
  return {
    create: purchase => stripe.checkout.sessions.create({
      mode: "payment", allowed_payment_method_types: ["card"], adaptive_pricing: { enabled: false }, client_reference_id: purchase.id,
      metadata: { purchaseId: purchase.id, userId: purchase.user_id, topicId: purchase.topic_id },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: 99, product_data: { name: "Hireland discussion history — sandbox", description: "One-time access to this fictional job discussion. No real payment.", metadata: { purchaseId: purchase.id, topicId: purchase.topic_id } } } }],
      success_url: `${appOrigin()}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin()}/topics/${purchase.topic_id}?checkout=cancelled`,
      expires_at: Math.floor(purchase.created_at / 1000) + 3600,
    }, { idempotencyKey: `hireland-${purchase.id}` }),
    retrieve: sessionId => stripe.checkout.sessions.retrieve(sessionId, { expand: ["line_items.data.price.product"] }),
  };
}
export function verifyStripeEvent(body: string, signature: string): Stripe.Event {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret?.startsWith("whsec_")) throw new Error("Webhook not configured");
  return stripe.webhooks.constructEvent(body, signature, secret);
}
