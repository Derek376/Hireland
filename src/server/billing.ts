import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import type { Fulfillment, Result } from "../shared/contracts.ts";
import { getDatabase, transaction } from "./db.ts";
import { getCurrentDemoUser } from "./identity.ts";
import { databaseResult, failure, success, validId } from "./results.ts";
import { stripeProvider, type StripeProvider, type PurchaseInput } from "./providers/stripe.ts";

interface Purchase extends PurchaseInput { expected_amount: number; currency: string; stripe_session_id: string | null; status: string }
const sessionIdValid = (id: string) => /^cs_test_[a-zA-Z0-9]{1,240}$/.test(id);
const globalState = globalThis as typeof globalThis & { hirelandCheckouts?: Map<string, Promise<Result<{ url: string }>>> };
const active = globalState.hirelandCheckouts ??= new Map();

function sessionMatches(session: Stripe.Checkout.Session, p: Purchase): boolean {
  const lines = session.line_items;
  const line = lines?.data[0];
  const price = line?.price;
  const product = price?.product;
  return session.id === p.stripe_session_id && session.livemode === false && session.mode === "payment"
    && session.client_reference_id === p.id && session.metadata?.purchaseId === p.id && session.metadata?.userId === p.user_id && session.metadata?.topicId === p.topic_id
    && session.currency === p.currency && session.amount_total === p.expected_amount && session.amount_subtotal === p.expected_amount
    && session.payment_method_types.length === 1 && session.payment_method_types[0] === "card"
    && !!lines && lines.has_more === false && lines.data.length === 1 && line?.quantity === 1 && line.amount_total === 99 && line.amount_subtotal === 99
    && price?.currency === "eur" && price.unit_amount === 99 && price.type === "one_time"
    && !!product && typeof product !== "string" && !('deleted' in product && product.deleted)
    && 'metadata' in product && product.metadata.purchaseId === p.id && product.metadata.topicId === p.topic_id;
}
export function createBillingService(providerReader: () => StripeProvider | null = stripeProvider, pending = active) {
  async function createCheckout(topicId: string): Promise<Result<{ url: string }>> {
    return databaseResult(async () => {
      const db = getDatabase(); const user = await getCurrentDemoUser();
      if (!validId(topicId) || !db.prepare("SELECT id FROM topics WHERE id=?").get(topicId)) return failure("NOT_FOUND", "Discussion not found.");
      if (db.prepare("SELECT 1 FROM entitlements WHERE user_id=? AND topic_id=?").get(user.id, topicId)) return failure("VALIDATION", "This discussion is already unlocked.");
      const provider = providerReader();
      if (!provider) return failure("NOT_CONFIGURED", "Stripe sandbox is not configured. Set STRIPE_SECRET_KEY to a sandbox test key; no payment was created.");
      const key = `${user.id}:${topicId}`;
      const running = pending.get(key); if (running) return running;
      const work = databaseResult(async () => {
        let purchase = db.prepare("SELECT * FROM purchases WHERE user_id=? AND topic_id=? AND status IN ('CREATING','PENDING') ORDER BY created_at DESC,id DESC LIMIT 1").get(user.id, topicId) as unknown as Purchase | undefined;
        if (purchase && !purchase.stripe_session_id && Date.now() - purchase.created_at >= 1800000) {
          db.prepare("UPDATE purchases SET status='FAILED',updated_at=? WHERE id=?").run(Date.now(), purchase.id); purchase = undefined;
        }
        if (purchase?.stripe_session_id) {
          let session: Stripe.Checkout.Session;
          try { session = await provider.retrieve(purchase.stripe_session_id); } catch { return failure("PROVIDER_ERROR", "Stripe sandbox is unavailable. Retry to recover the same checkout.", true); }
          if (!sessionMatches(session, purchase)) return failure("PROVIDER_ERROR", "Checkout details could not be verified. No access was granted.");
          if (session.payment_status === "paid") return failure("VALIDATION", "A paid checkout needs confirmation. Use Check payment on this discussion.");
          if (session.status === "open" && session.url) return checkoutUrl(session.url);
          if (session.status !== "expired") return failure("PROVIDER_ERROR", "Checkout is awaiting confirmation. Use Check payment.", true);
          db.prepare("UPDATE purchases SET status='EXPIRED',updated_at=? WHERE id=? AND status!='PAID'").run(Date.now(), purchase.id); purchase = undefined;
        }
        if (!purchase) {
          purchase = { id: randomUUID(), user_id: user.id, topic_id: topicId, created_at: Date.now(), expected_amount: 99, currency: "eur", stripe_session_id: null, status: "CREATING" };
          db.prepare("INSERT INTO purchases VALUES (?,?,?,?,?,?,?, ?,?)").run(purchase.id, user.id, topicId, 99, "eur", null, "CREATING", purchase.created_at, purchase.created_at);
        }
        // Reuse the same row/idempotency key after ambiguous HTTP or DB failures.
        let session: Stripe.Checkout.Session;
        try { session = await provider.create(purchase); } catch { return failure("PROVIDER_ERROR", "Stripe sandbox is unavailable. Retry to recover the same checkout.", true); }
        if (session.livemode || !sessionIdValid(session.id) || !session.url || session.client_reference_id !== purchase.id || session.metadata?.purchaseId !== purchase.id) return failure("PROVIDER_ERROR", "Stripe returned an unexpected checkout. No access was granted.");
        const url = checkoutUrl(session.url); if (!url.ok) return url;
        db.prepare("UPDATE purchases SET stripe_session_id=?,status='PENDING',updated_at=? WHERE id=? AND status='CREATING'").run(session.id, Date.now(), purchase.id);
        return url;
      });
      pending.set(key, work);
      try { return await work; } finally { if (pending.get(key) === work) pending.delete(key); }
    });
  }
  async function fulfillCheckout(sessionId: string, requireCurrentUser = true): Promise<Result<Fulfillment>> {
    return databaseResult<Fulfillment>(async () => {
      if (!sessionIdValid(sessionId)) return failure("VALIDATION", "Invalid sandbox session.");
      const db = getDatabase();
      const p = db.prepare("SELECT * FROM purchases WHERE stripe_session_id=?").get(sessionId) as unknown as Purchase | undefined;
      if (!p) return failure("NOT_FOUND", "Checkout is not recorded in this application.");
      if (requireCurrentUser && p.user_id !== (await getCurrentDemoUser()).id) return failure("FORBIDDEN", "This checkout does not belong to the current demo user.");
      const provider = providerReader(); if (!provider) return failure("NOT_CONFIGURED", "Stripe sandbox is not configured.");
      let session: Stripe.Checkout.Session;
      try { session = await provider.retrieve(sessionId); } catch { return failure("PROVIDER_ERROR", "Couldn't confirm Stripe payment. Try Check payment again; no new charge is created.", true); }
      if (!sessionMatches(session, p)) return failure("VALIDATION", "Payment details do not match the local order. Access was not granted.");
      if (session.payment_status !== "paid" || session.status !== "complete") {
        if (session.status === "expired") db.prepare("UPDATE purchases SET status='EXPIRED',updated_at=? WHERE id=? AND status!='PAID'").run(Date.now(), p.id);
        return success({ status: "PENDING", topicId: p.topic_id });
      }
      transaction(db, () => {
        db.prepare("UPDATE purchases SET status='PAID',updated_at=? WHERE id=?").run(Date.now(), p.id);
        db.prepare("INSERT INTO entitlements VALUES (?,?,?,?) ON CONFLICT(user_id,topic_id) DO NOTHING").run(p.user_id, p.topic_id, p.id, Date.now());
      });
      return success({ status: "UNLOCKED", topicId: p.topic_id });
    });
  }
  async function recoverTopic(topicId: string): Promise<Result<Fulfillment>> {
    return databaseResult(async () => {
      const db = getDatabase(); const user = await getCurrentDemoUser();
      if (!validId(topicId) || !db.prepare("SELECT id FROM topics WHERE id=?").get(topicId)) return failure("NOT_FOUND", "Discussion not found.");
      if (db.prepare("SELECT 1 FROM entitlements WHERE user_id=? AND topic_id=?").get(user.id, topicId)) return success({ status: "UNLOCKED", topicId });
      const rows = db.prepare("SELECT stripe_session_id FROM purchases WHERE user_id=? AND topic_id=? AND stripe_session_id IS NOT NULL AND status IN ('PENDING','PAID') ORDER BY created_at DESC LIMIT 5").all(user.id, topicId);
      for (const row of rows) { const result = await fulfillCheckout(String(row.stripe_session_id)); if (!result.ok || result.value.status === "UNLOCKED") return result; }
      return success({ status: "PENDING", topicId });
    });
  }
  return { createCheckout, fulfillCheckout, recoverTopic };
}
function checkoutUrl(value: string): Result<{ url: string }> {
  try { const url = new URL(value); if (url.protocol === "https:" && url.hostname === "checkout.stripe.com") return success({ url: url.href }); } catch { /* Reject untrusted provider redirect. */ }
  return failure("PROVIDER_ERROR", "Stripe returned an invalid checkout URL.");
}
const billing = createBillingService();
export const createCheckout = billing.createCheckout;
export const fulfillCheckout = (sessionId: string) => billing.fulfillCheckout(sessionId, true);
// Only the signed webhook handler calls this entry point. No client-controlled owner bypass.
export const fulfillSignedCheckout = (sessionId: string) => billing.fulfillCheckout(sessionId, false);
export const recoverTopic = billing.recoverTopic;
