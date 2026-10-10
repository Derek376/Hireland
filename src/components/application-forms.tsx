"use client";

import { useActionState } from "react";
import Link from "next/link";
import { INITIAL_FORM_STATE } from "@/shared/form-state";
import { saveApplicationAction } from "@/actions/applications";
import { FormMessage } from "./form-message";
import { Icon } from "./icon";

export function SaveApplicationForm({ jobId, saved, compact = false }: { jobId: string; saved: boolean; compact?: boolean }) {
  const [state, action, pending] = useActionState(saveApplicationAction, INITIAL_FORM_STATE);
  return <div className={compact ? "compact-save" : "save-application"}><form action={action}><input type="hidden" name="jobId" value={jobId} /><button className={compact ? `save-button ${saved ? "is-saved" : ""}` : "button"} disabled={pending || saved} aria-label={compact ? saved ? "Saved to tracker" : "Save to tracker" : undefined}>{compact ? <Icon name="bookmark" /> : null}{pending ? "Saving…" : saved ? compact ? "Saved" : "Saved to tracker" : compact ? "Save" : "Save to tracker"}</button></form>
    {compact ? <div className={state.status === "error" ? "compact-save-error" : "sr-only"}><FormMessage state={state} /></div> : <><FormMessage state={state} />{saved ? <Link className="inline-link" href="/applications">View your applications ↗</Link> : null}</>}</div>;
}
