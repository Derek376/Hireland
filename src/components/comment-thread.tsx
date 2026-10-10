"use client";
import { startTransition, useActionState, useId, useRef, useState } from "react";
import type { Comment, CommentReply } from "@/shared/contracts";
import { INITIAL_FORM_STATE, type FormState } from "@/shared/form-state";
import { addCommentReplyAction } from "@/actions/community";
import { initials } from "@/shared/community-display";
import { CommentReactions } from "./comment-reactions";
import { FormMessage } from "./form-message";
import { Icon } from "./icon";

const date = (timestamp: number) => new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(timestamp);

export function CommentThread({ topicId, comment, replies }: { topicId: string; comment: Comment; replies: CommentReply[] }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const [draft, setDraft] = useState("");
  const [state, action, pending] = useActionState(async (previous: FormState, data: FormData) => {
    const result = await addCommentReplyAction(previous, data);
    if (result.status === "success") startTransition(() => setDraft(""));
    return result;
  }, INITIAL_FORM_STATE);
  const focusComment = () => { input.current?.focus(); input.current?.scrollIntoView({ block: "center", behavior: "smooth" }); };
  return <div className="comment-thread">
    <article className="thread-root"><span className="avatar comment-avatar tone-0">{initials(comment.authorLabel)}</span><div><div className="thread-author"><strong>{comment.authorLabel}</strong><time dateTime={new Date(comment.createdAt).toISOString()}>{date(comment.createdAt)} UTC</time></div><p className="comment-body">{comment.body}</p><span className="tag">{comment.isSynthetic ? "Fictional demo comment" : "Local post · unverified"}</span><CommentReactions topicId={topicId} commentId={comment.id} votes={comment} replyCount={comment.replyCount} onComment={focusComment} /></div></article>
    <section className="post-replies" aria-labelledby={`${fieldId}-comments`}>
      <div className="reply-list-heading"><h2 id={`${fieldId}-comments`}>Comments <span>{replies.length}</span></h2><span>Oldest first</span></div>
      {replies.length ? <ol className="reply-list">{replies.map((reply, index) => <li key={reply.id} className="reply-item"><span className={`avatar comment-avatar tone-${(index + 1) % 3}`}>{initials(reply.authorLabel)}</span><article><div className="thread-author"><strong>{reply.authorLabel}</strong><time dateTime={new Date(reply.createdAt).toISOString()}>{date(reply.createdAt)} UTC</time></div><p className="comment-body">{reply.body}</p><span className="tag">Local comment · unverified</span><CommentReactions topicId={topicId} commentId={comment.id} replyId={reply.id} votes={reply} /></article></li>)}</ol> : <p className="reply-empty">No comments yet. Be the first to reply to this post.</p>}
    </section>
    <section id="post-comment" className="reply-composer" aria-labelledby={`${fieldId}-title`}><div className="reply-composer-heading"><span className="avatar comment-avatar tone-0">DS</span><div><h2 id={`${fieldId}-title`}>Add a comment</h2><p>Replying to {comment.authorLabel}</p></div></div>
      <form action={action} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); startTransition(() => action(data)); }}>
        <input type="hidden" name="topicId" value={topicId} /><input type="hidden" name="commentId" value={comment.id} />
        <label htmlFor={fieldId}>Your comment</label><textarea id={fieldId} ref={input} name="body" required maxLength={1000} rows={3} disabled={pending} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a comment or ask a follow-up question…" />
        <div className="reply-form-footer"><span>{draft.length} / 1,000 · Use fictional details</span><button type="submit" className="button" disabled={pending || !draft.trim()}><Icon name="chat" size={15} />{pending ? "Posting…" : "Post comment"}</button></div>
      </form><FormMessage state={state} />
    </section>
  </div>;
}
