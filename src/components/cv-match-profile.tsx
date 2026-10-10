"use client";
import { useRef, useState, useTransition } from "react";
import { uploadCvAction } from "@/actions/profile";
import type { CvSummary, WorkspaceJob } from "@/shared/workspace";
import type { FormState } from "@/shared/form-state";
import { AssessmentPanel } from "./assessment-panel";
import { Icon } from "./icon";

export function CvMatchProfile({ row, cv }: { row: WorkspaceJob; cv: CvSummary | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<FormState>({ status: "idle", message: "" });
  const cvCard = <div className="cv-attachment">
    <div className="cv-preview" role="img" aria-label="Illustrative CV thumbnail, not a preview of your file">
      <div className="cv-paper" aria-hidden="true"><b>CV</b><i /><i /><hr /><i /><i /><i /><hr /><i /><i /></div>
      <span>Sample preview</span>
    </div>
    <div className="cv-attachment-info"><strong>{cv?.fileName ?? (row.profileReady ? "Your saved CV" : "Upload your CV")}</strong><span className="cv-file-status">{row.profileReady ? <><Icon name="check" size={12} />CV ready</> : "Add a CV to check your match"}</span>{cv ? <span>Updated {new Intl.DateTimeFormat("en-IE", { day: "numeric", month: "short", timeZone: "UTC" }).format(cv.updatedAt)}</span> : null}
      <button type="button" className="button secondary" disabled={pending} onClick={() => input.current?.click()}>{pending ? "Uploading…" : row.profileReady ? "Update CV" : "Upload CV"}</button>
    </div>
    <input ref={input} type="file" className="cv-file-input" aria-label="Upload CV attachment" accept=".pdf,.docx,.txt" disabled={pending} onChange={event => {
      const file = event.currentTarget.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) { setNotice({ status: "error", message: "Your CV file must be 5 MB or smaller." }); return; }
      const data = new FormData(); data.set("cvFile", file);
      setNotice({ status: "idle", message: "" });
      startTransition(async () => {
        try { setNotice(await uploadCvAction(data)); }
        catch { setNotice({ status: "error", message: "Upload failed. Your saved CV is unchanged. Please try again." }); }
      });
    }} />
    <p className="cv-upload-help">PDF, DOCX or TXT · Up to 5 MB · Saved locally</p>
    <div className="cv-upload-notice" aria-live="polite">{notice.message ? <p role={notice.status === "error" ? "alert" : undefined} className={notice.status === "error" ? "error-banner" : "form-success"}>{notice.message}</p> : null}</div>
  </div>;
  return row.assessmentError ? <>{cvCard}<p role="alert" className="error-banner">{row.assessmentError}</p></> : <AssessmentPanel key={`${row.job.id}:${row.assessmentKey}`} jobId={row.job.id} initial={row.assessment} configured={row.aiConfigured} profileReady={row.profileReady} cvCard={cvCard} uploading={pending} />;
}
