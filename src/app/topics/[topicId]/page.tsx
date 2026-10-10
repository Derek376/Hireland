import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopicComments, getCommentReplies } from "@/server/community";
import { getDatabase } from "@/server/db";
import { stripeClient } from "@/server/providers/stripe";
import { CommentForm, PaymentForms } from "@/components/community-forms";
import { Icon } from "@/components/icon";
import { commentTitle, initials } from "@/shared/community-display";
import { CommentThread } from "@/components/comment-thread";
import { CommentReactions } from "@/components/comment-reactions";

const date = (timestamp: number) => new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(timestamp);
export default async function TopicPage({ params, searchParams }: { params: Promise<{ topicId: string }>; searchParams: Promise<{ checkout?: string; comment?: string; from?: string }> }) {
  const { topicId } = await params;
  const result = await getTopicComments(topicId);
  if (!result.ok) { if (result.error.code === "NOT_FOUND") notFound(); return <p role="alert" className="error-banner">{result.error.message}</p>; }
  const topic = getDatabase().prepare("SELECT job_id,title,company FROM topics JOIN jobs ON jobs.id=topics.job_id WHERE topics.id=?").get(topicId)!;
  const { comments, totalCount, unlocked } = result.value;
  const search = await searchParams;
  // Deep links search only the already-authorized bodies; they cannot retrieve a hidden post.
  const selected = search.comment ? comments.find(comment => comment.id === search.comment) : null;
  const back = `${search.from === "tracker" ? "/applications" : "/"}?discussion=${encodeURIComponent(String(topic.job_id))}`;
  const rest = selected ? comments.filter(comment => comment.id !== selected.id) : comments;
  const replies = selected ? await getCommentReplies(topicId, selected.id) : null;
  return <div className="thread-page"><div className="thread-toolbar"><Link className="back-link" href={back}><Icon name="back" />Back to community preview</Link><a href={search.comment && !selected ? `/topics/${topicId}#post-comment` : "#post-comment"} className="button secondary"><Icon name="chat" />{selected ? "Add comment" : "Post comment"}</a></div>
    <div className="thread-job"><Link href={`/jobs/${topic.job_id}`}>{String(topic.company)}</Link><span>/</span><span>{String(topic.title)}</span></div>
    <p className="thread-access"><span className="stage-pill">Job community</span><Icon name={unlocked ? "check" : "gift"} />{unlocked ? "All comments unlocked" : "Included in your free preview"}</p>
    {search.checkout === "cancelled" ? <p className="info-banner" role="status">Checkout cancelled. Access changes only after a verified payment. You can check an existing payment below.</p> : null}
    {search.comment && !selected ? <p className="info-banner">This comment is not available in your current preview. You can read the latest comments below.</p> : null}
    <h1>{selected ? commentTitle(selected.body) : `${String(topic.company)} job discussion`}</h1>
    {selected ? replies?.ok ? <CommentThread key={selected.id} topicId={topicId} comment={selected} replies={replies.value} /> : <p role="alert" className="error-banner">{replies && !replies.ok ? replies.error.message : "Comments unavailable. Please refresh."}</p> : <p className="thread-description">Share questions and compare notes about this role. All community reports are unverified.</p>}
    {!selected || rest.length ? <div className="thread-section-heading"><h2>{selected ? "More from this conversation" : unlocked ? "All posts" : "Latest posts"}</h2><span>{comments.length} of {totalCount} posts available · Newest first</span></div> : null}
    <ol className="thread-comments">{rest.map((comment, index) => <li key={comment.id}><span className={`avatar comment-avatar tone-${index % 3}`}>{initials(comment.authorLabel)}</span><article><div className="thread-author"><strong>{comment.authorLabel}</strong><time dateTime={new Date(comment.createdAt).toISOString()}>{date(comment.createdAt)} UTC</time></div><p className="comment-body">{comment.body}</p><span className="tag">{comment.isSynthetic ? "Fictional example" : "Local post · unverified"}</span><Link href={`/topics/${topicId}?comment=${encodeURIComponent(comment.id)}${search.from === "tracker" ? "&from=tracker" : ""}`} className="comment-detail-link">Open comment <Icon name="arrow" size={13} /></Link><CommentReactions topicId={topicId} commentId={comment.id} votes={comment} replyCount={comment.replyCount} commentHref={`/topics/${topicId}?comment=${encodeURIComponent(comment.id)}${search.from === "tracker" ? "&from=tracker" : ""}#post-comment`} /></article></li>)}</ol>
    {!comments.length ? <p className="empty-inline">No comments yet. Start the conversation below.</p> : null}
    {!unlocked && totalCount > comments.length ? <PaymentForms topicId={topicId} configured={!!stripeClient()} compact /> : unlocked ? <p className="preview-notice is-unlocked"><Icon name="check" />This discussion is unlocked. Access is saved on this demo machine.</p> : null}
    {!selected && !search.comment ? <div id="post-comment"><CommentForm topicId={topicId} compact /></div> : search.comment && !selected ? <p className="small-note">Open an available post above to comment, or <Link href={`/topics/${topicId}`} className="inline-link">start a new post</Link>.</p> : null}<p className="community-disclaimer">Fictional examples are not real applicant experiences. Community reports do not represent official employer information.</p>
  </div>;
}
