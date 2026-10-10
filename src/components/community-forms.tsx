"use client";
import { useActionState } from "react";
import { INITIAL_FORM_STATE } from "@/shared/form-state";
import { addCommentAction, checkoutAction, recoverPaymentAction } from "@/actions/community";
import { FormMessage } from "./form-message";

export function CommentForm({ topicId }: { topicId: string }) {
  const [state, action, pending] = useActionState(addCommentAction, INITIAL_FORM_STATE);
  return <section className="panel"><h2>Add to the discussion</h2><p className="small-note">Local demo post, not a verified applicant review. Use fictional details; do not include personal information.</p><form action={action}><input type="hidden" name="topicId" value={topicId} /><label htmlFor="comment-body">Your comment</label><textarea id="comment-body" name="body" required maxLength={1000} rows={4} disabled={pending} /><button className="button" disabled={pending}>{pending ? "Posting…" : "Post comment"}</button></form><FormMessage state={state} /></section>;
}
export function PaymentForms({ topicId, configured }: { topicId: string; configured: boolean }) {
  const [state, buy, buying] = useActionState(checkoutAction, INITIAL_FORM_STATE);
  const [recovery, check, checking] = useActionState(recoverPaymentAction, INITIAL_FORM_STATE);
  return <section className="panel"><p className="eyebrow green">SANDBOX ONLY</p><h2>Unlock this discussion · €0.99 EUR</h2><p>One-time access to all existing and future comments on this job, for the current local demo user. Other discussions stay locked.</p><p className="small-note">The older comments are fictional examples. This tests a purchase flow; no real money is collected. One topic keeps the demo price and access scope simple; willingness to pay is untested.</p>{!configured ? <p role="status" className="small-note">Stripe sandbox is awaiting server configuration.</p> : null}<form action={buy}><input type="hidden" name="topicId" value={topicId} /><button className="button" disabled={!configured || buying || checking}>{buying ? "Opening checkout…" : "Buy sandbox access · €0.99"}</button></form><FormMessage state={state} /><form action={check}><input type="hidden" name="topicId" value={topicId} /><button className="button secondary" disabled={!configured || buying || checking}>{checking ? "Confirming…" : "Check payment / recover access"}</button></form><p className="small-note">Paid but closed Checkout before returning? Check payment here. Cancelled or unpaid sessions cannot unlock access.</p><FormMessage state={recovery} /></section>;
}
