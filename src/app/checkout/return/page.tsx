import Link from "next/link";
import { fulfillCheckout } from "@/server/billing";

export default async function CheckoutReturn({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const result = await fulfillCheckout(session_id ?? "");
  return <section className="panel"><p className="eyebrow green">STRIPE SANDBOX</p><h1>{result.ok && result.value.status === "UNLOCKED" ? "Payment confirmed. Access unlocked." : "Payment needs confirmation."}</h1>{result.ok ? <><p>{result.value.status === "UNLOCKED" ? "The server verified the sandbox session, amount and topic before saving your access. No real money was collected." : "Stripe has not confirmed a paid checkout. No access was granted."}</p>{result.value.status === "UNLOCKED" ? <p className="payment-receipt">Paid · €0.99 EUR · one discussion<br />Stripe test transaction: <code>{session_id}</code></p> : null}<Link className="button" href={`/topics/${result.value.topicId}`}>Back to discussion</Link></> : <p role="alert" className="error-banner">{result.error.message}</p>}<p className="small-note">A return URL is not proof of payment. If confirmation failed, open the original job discussion and use Check payment to recover; do not buy again.</p><Link className="inline-link" href="/">Browse jobs ↗</Link></section>;
}
