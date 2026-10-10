"use client";

import { useActionState } from "react";
import Link from "next/link";
import { APPLICATION_STATUSES, type Application } from "@/shared/contracts";
import { INITIAL_FORM_STATE } from "@/shared/form-state";
import { deleteApplicationAction, saveApplicationAction, updateApplicationAction } from "@/actions/applications";
import { FormMessage } from "./form-message";
import { Icon } from "./icon";

export function SaveApplicationForm({ jobId, saved, compact = false }: { jobId: string; saved: boolean; compact?: boolean }) {
  const [state, action, pending] = useActionState(saveApplicationAction, INITIAL_FORM_STATE);
  return <div className={compact ? "compact-save" : "save-application"}><form action={action}><input type="hidden" name="jobId" value={jobId} /><button className={compact ? `save-button ${saved ? "is-saved" : ""}` : "button"} disabled={pending || saved} aria-label={compact ? saved ? "Saved to tracker" : "Save to tracker" : undefined}>{compact ? <Icon name="bookmark" /> : null}{pending ? "Saving…" : saved ? compact ? "Saved" : "Saved to tracker" : compact ? "Save" : "Save to tracker"}</button></form>
    {compact ? <div className={state.status === "error" ? "compact-save-error" : "sr-only"}><FormMessage state={state} /></div> : <><FormMessage state={state} />{saved ? <Link className="inline-link" href="/applications">View your applications ↗</Link> : null}</>}</div>;
}
export function ApplicationControls({ application }: { application: Application }) {
  const [state, action, pending] = useActionState(updateApplicationAction, INITIAL_FORM_STATE);
  const [deletion, remove, removing] = useActionState(deleteApplicationAction, INITIAL_FORM_STATE);
  const busy = pending || removing;
  return <div className="application-controls">
    <form action={action} className="status-form"><input type="hidden" name="applicationId" value={application.id} /><label htmlFor={`status-${application.id}`}>Status</label>
      <select key={application.status} id={`status-${application.id}`} name="status" defaultValue={application.status} disabled={busy}>{APPLICATION_STATUSES.map(value => <option key={value} value={value}>{value}</option>)}</select>
      <button className="button secondary" disabled={busy}>{pending ? "Updating…" : "Update status"}</button></form>
    <FormMessage state={state} />
    <form action={remove}><input type="hidden" name="applicationId" value={application.id} /><button className="text-button danger" disabled={busy}>{removing ? "Removing…" : "Remove from tracker"}</button></form>
    <FormMessage state={deletion} />
  </div>;
}
