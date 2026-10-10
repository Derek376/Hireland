"use client";
import Link from "next/link";
import { useActionState } from "react";
import { commentReactionAction } from "@/actions/community";
import { INITIAL_FORM_STATE } from "@/shared/form-state";
import type { ReactionSummary } from "@/shared/contracts";
import { Icon } from "./icon";

export function CommentReactions({ topicId, commentId, replyId, votes, replyCount, onComment, commentHref }: { topicId: string; commentId: string; replyId?: string; votes: ReactionSummary; replyCount?: number; onComment?: () => void; commentHref?: string }) {
  const [state, action, pending] = useActionState(commentReactionAction, INITIAL_FORM_STATE);
  return <div className="comment-interactions" aria-busy={pending}>
    <div className="comment-action-row"><form action={action} className="reaction-buttons">
      <input type="hidden" name="topicId" value={topicId} /><input type="hidden" name="commentId" value={commentId} />{replyId ? <input type="hidden" name="replyId" value={replyId} /> : null}
      <button type="submit" name="reaction" value={votes.reaction === "LIKE" ? "NONE" : "LIKE"} aria-pressed={votes.reaction === "LIKE"} disabled={pending} className={`reaction-button ${votes.reaction === "LIKE" ? "is-liked" : ""}`}><Icon name="like" size={15} /><span>Like</span><span className="reaction-count">{votes.likes}</span></button>
      <button type="submit" name="reaction" value={votes.reaction === "DISLIKE" ? "NONE" : "DISLIKE"} aria-pressed={votes.reaction === "DISLIKE"} disabled={pending} className={`reaction-button ${votes.reaction === "DISLIKE" ? "is-disliked" : ""}`}><Icon name="dislike" size={15} /><span>Dislike</span><span className="reaction-count">{votes.dislikes}</span></button>
    </form>{replyCount !== undefined ? onComment ? <button type="button" className="comment-reply-button" onClick={onComment}><Icon name="chat" size={15} />Comment <span className="reaction-count">{replyCount}</span></button> : commentHref ? <Link className="comment-reply-button" href={commentHref}><Icon name="chat" size={15} />Comment <span className="reaction-count">{replyCount}</span></Link> : null : null}
    </div>
    <p className={state.status === "error" ? "reaction-error" : "sr-only"} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{pending ? "Saving reaction…" : state.message}</p>
  </div>;
}
