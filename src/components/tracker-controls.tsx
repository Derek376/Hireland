"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { Application, ApplicationStatus, ApplicationStatusEvent } from "@/shared/contracts";
import { APPLICATION_STATUSES } from "@/shared/contracts";
import { statusLabel } from "@/shared/application-display";
import { INITIAL_FORM_STATE } from "@/shared/form-state";
import { deleteApplicationAction, updateApplicationAction } from "@/actions/applications";
import { FormMessage } from "./form-message";
import { Icon } from "./icon";

export function TrackerStatus({ application, role }: { application: Application; role: string }) {
  const [state, action, pending] = useActionState(updateApplicationAction, INITIAL_FORM_STATE);
  const [selected, setSelected] = useState(application.status);
  const select = useRef<HTMLSelectElement>(null);
  const restoreFocus = useRef(false);
  useEffect(() => { setSelected(application.status); }, [application.status, application.updatedAt]);
  useEffect(() => { if (state.status === "error") setSelected(application.status); }, [state, application.status]);
  useEffect(() => {
    if (!pending && restoreFocus.current) {
      select.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [pending]);
  return <div className="tracker-stage"><form action={action} aria-busy={pending}>
    <input type="hidden" name="applicationId" value={application.id} />
    <div className={`stage-select stage-pill status-${selected.toLowerCase()}`}>
      <select ref={select} name="status" aria-label={`Status for ${role}`} title="Click to change status" value={selected} disabled={pending}
        onChange={event => {
          const status = event.currentTarget.value as ApplicationStatus;
          const data = new FormData(event.currentTarget.form!);
          data.set("status", status);
          restoreFocus.current = document.activeElement === event.currentTarget;
          setSelected(status);
          startTransition(() => action(data));
        }}>
        {APPLICATION_STATUSES.map(status => <option key={status} value={status}>{statusLabel[status]}</option>)}
      </select><Icon name="chevron" size={12} />
    </div>
    <noscript><button className="text-button">Save status</button></noscript>
    {pending ? <span className="stage-saving" role="status">Saving…</span> : null}
  </form><div className={state.status === "error" ? "stage-error" : "sr-only"}><FormMessage state={state} /></div></div>;
}

export function TrackerHistory({ events }: { events: ApplicationStatusEvent[] }) {
  return <details className="tracker-history"><summary><Icon name="history" size={13} />History<span>{events.length}</span><Icon name="chevron" size={12} /></summary>
    <div className="history-content"><h3>Status history</h3><p>Your updates, newest first · UTC</p>
      {events.length ? <ol>{events.map(event => <li key={event.id}><span className="history-dot" /><div className="history-transition">
        {event.kind === "CHANGED" ? <><span>{statusLabel[event.fromStatus!]}</span><Icon name="arrow" size={13} /><strong>{statusLabel[event.toStatus]}</strong></>
          : <><strong>{event.kind === "CREATED" ? "Saved to tracker" : `History starts at ${statusLabel[event.toStatus]}`}</strong>{event.kind === "BASELINE" ? <small>Earlier changes were not recorded.</small> : null}</>}
      </div><time dateTime={new Date(event.createdAt).toISOString()}>{new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "medium", timeZone: "UTC" }).format(event.createdAt)}</time></li>)}</ol> : <p>No recorded changes yet.</p>}
    </div>
  </details>;
}

export function RemoveFromTracker({ application, role }: { application: Application; role: string }) {
  const [state, action, pending] = useActionState(deleteApplicationAction, INITIAL_FORM_STATE);
  return <div className="tracker-remove"><form action={action}><input type="hidden" name="applicationId" value={application.id} />
    <button className="text-button" disabled={pending} aria-label={`Remove ${role} from tracker`}><Icon name="trash" size={13} />{pending ? "Removing…" : "Remove"}</button>
  </form><FormMessage state={state} /></div>;
}
