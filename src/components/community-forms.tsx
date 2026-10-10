"use client";
import { useActionState, useId } from "react";
import { INITIAL_FORM_STATE } from "@/shared/form-state";
import { addCommentAction, checkoutAction, recoverPaymentAction } from "@/actions/community";
import { FormMessage } from "./form-message";
import { Icon } from "./icon";

export function CommentForm({ topicId, compact = false }: { topicId: string; compact?: boolean }) {
  const [state, action, pending] = useActionState(addCommentAction, INITIAL_FORM_STATE);
  const fieldId = useId();
  return <section className={compact ? "comment-compose" : "panel comment-compose"}><h2>Join the conversation</h2><p className="small-note">Use fictional details. Community posts are unverified.</p><form action={action}><input type="hidden" name="topicId" value={topicId} /><label htmlFor={fieldId}>Your comment</label><textarea id={fieldId} name="body" required maxLength={1000} rows={compact ? 3 : 4} disabled={pending} placeholder="Share your experience or ask a question…" /><button className="button" disabled={pending}><Icon name="chat" />{pending ? "Posting…" : "Post comment"}</button></form><FormMessage state={state} /></section>;
}
export function PaymentForms({ topicId, configured, compact = false }: { topicId: string; configured: boolean; compact?: boolean }) {
  const [state, buy, buying] = useActionState(checkoutAction, INITIAL_FORM_STATE);
  const [recovery, check, checking] = useActionState(recoverPaymentAction, INITIAL_FORM_STATE);
  return <section className={compact ? "unlock-card" : "panel unlock-card"}><div className="unlock-heading"><span className="lock-mark"><Icon name="lock" size={20} /></span><div><h2>Unlock all comments</h2><p>Read the full conversation for this job.</p></div></div><div className="unlock-purchase"><span><strong>€0.99</strong> · one topic</span><form action={buy}><input type="hidden" name="topicId" value={topicId} /><button className="button" disabled={!configured || buying || checking}>{buying ? "Opening checkout…" : "Unlock full access"}</button></form></div><p className="sandbox-note">One-time sandbox purchase. No real money is collected.</p>{!configured ? <p role="status" className="configuration-note">Stripe test checkout is not configured on this machine.</p> : null}<FormMessage state={state} /><details className="payment-recovery"><summary>Already paid? Check your access</summary><p>Confirm your payment without starting another purchase.</p><form action={check}><input type="hidden" name="topicId" value={topicId} /><button className="button secondary" disabled={!configured || buying || checking}>{checking ? "Confirming…" : "Check payment / recover access"}</button></form><FormMessage state={recovery} /></details></section>;
}
