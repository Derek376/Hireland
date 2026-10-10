import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicComments } from "@/server/community";
import { getDatabase } from "@/server/db";
import { stripeClient } from "@/server/providers/stripe";
import { CommentForm, PaymentForms } from "@/components/community-forms";

export default async function TopicPage({ params, searchParams }: { params: Promise<{ topicId: string }>; searchParams: Promise<{ checkout?: string }> }) {
  const { topicId } = await params;
  const result = await getTopicComments(topicId);
  if (!result.ok) { if (result.error.code === "NOT_FOUND") notFound(); return <p role="alert" className="error-banner">{result.error.message}</p>; }
  const topic = getDatabase().prepare("SELECT job_id,title,company FROM topics JOIN jobs ON jobs.id=topics.job_id WHERE topics.id=?").get(topicId)!;
  const { comments, totalCount, unlocked } = result.value;
  const cancelled = (await searchParams).checkout === "cancelled";
  return <><Link className="back-link" href={`/jobs/${topic.job_id}`}>← Back to the role</Link><div className="page-heading"><p className="eyebrow green">JOB DISCUSSION</p><h1>{String(topic.title)}</h1><p className="muted">{String(topic.company)} · Fictional demo discussion</p></div>{cancelled ? <p className="form-success">You returned from Checkout. This does not confirm payment or unlock access. You can check payment or try again.</p> : null}<div className="detail-layout"><section className="panel"><h2>{unlocked ? "All comments · access unlocked" : "Latest three comments"}</h2><p className="small-note">{comments.length} of {totalCount} comments. {unlocked ? "Sandbox payment confirmed for this topic." : `${Math.max(0, totalCount - comments.length)} older comments are locked.`}</p>{comments.length ? <ol className="comment-list">{comments.map(comment => <li key={comment.id}><div className="comment-meta"><strong>{comment.authorLabel}</strong><span className="tag">{comment.isSynthetic ? "Fictional demo comment" : "Local demo post · unverified"}</span></div><p className="comment-body">{comment.body}</p><time className="small-note" dateTime={new Date(comment.createdAt).toISOString()}>{new Date(comment.createdAt).toISOString()}</time></li>)}</ol> : <p>No comments yet.</p>}</section><aside className="detail-sidebar">{!unlocked ? <PaymentForms topicId={topicId} configured={!!stripeClient()} /> : <section className="panel"><h2>This discussion is unlocked.</h2><p>€0.99 EUR · one-time sandbox purchase. Access is saved in the local database.</p></section>}<CommentForm topicId={topicId} /></aside></div></>;
}
