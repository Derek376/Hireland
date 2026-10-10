"use client";
import Link from "next/link";
import { useState } from "react";
import type { TopicComments } from "@/shared/contracts";
import { Icon } from "./icon";
import { CommentForm, PaymentForms } from "./community-forms";
import { commentTitle, initials } from "@/shared/community-display";
export function CommunityPreview({ topic, configured, tracker = false }: { topic: TopicComments; configured: boolean; tracker?: boolean }) {
  const [kind, setKind] = useState("all");
  const [composing, setComposing] = useState(false);
  const filtered = topic.comments.filter(comment => kind === "all" || (kind === "demo" ? comment.isSynthetic : !comment.isSynthetic));
  return <div className="community-preview">
    <label className="comment-filter">Filter comments<select value={kind} onChange={event => setKind(event.target.value)}><option value="all">All comments</option><option value="demo">Fictional examples</option><option value="local">Local posts</option></select></label>
    <div className={`preview-notice ${topic.unlocked ? "is-unlocked" : ""}`}><Icon name={topic.unlocked ? "check" : "gift"} size={22} /><div><strong>{topic.unlocked ? "All comments unlocked" : "3 free comments per job"}</strong><span>{topic.unlocked ? "Your access is saved for this topic." : "The latest posts, across this conversation."}</span></div></div>
    <div className="preview-toolbar"><span>{topic.comments.length} of {topic.totalCount} comments</span><button className="button" onClick={() => setComposing(!composing)} aria-expanded={composing}><Icon name="chat" />Post comment</button></div>
    <ol className="preview-list">{filtered.map((comment, index) => <li key={comment.id}><Link href={`/topics/${topic.topicId}?comment=${encodeURIComponent(comment.id)}${tracker ? "&from=tracker" : ""}`} className="preview-comment"><span className={`avatar comment-avatar tone-${index % 3}`}>{initials(comment.authorLabel)}</span><div><div className="preview-author">{comment.authorLabel.replace(/\s*\(fictional\)/g, "")}<span className="stage-pill">{comment.isSynthetic ? "Demo" : "Local post"}</span></div><h3>{commentTitle(comment.body)}</h3><p>{comment.isSynthetic ? "Fictional example · " : "Unverified report · "}<time dateTime={new Date(comment.createdAt).toISOString()}>{new Intl.DateTimeFormat("en-IE", { month: "short", day: "numeric", timeZone: "UTC" }).format(comment.createdAt)}</time></p></div><Icon name="chevron" style={{ transform: "rotate(-90deg)" }} /></Link></li>)}</ol>
    {!filtered.length ? <p className="empty-inline">No comments in this filter.</p> : null}
    {composing ? <CommentForm topicId={topic.topicId} compact /> : null}
    {!topic.unlocked && topic.totalCount > topic.comments.length ? <PaymentForms topicId={topic.topicId} configured={configured} compact /> : null}
    <p className="community-disclaimer">Community reports are unverified. Fictional examples do not describe real hiring outcomes.</p>
  </div>;
}
