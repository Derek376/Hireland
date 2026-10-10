"use client";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { assessJobAction } from "@/actions/assessments";
import { INITIAL_ASSESSMENT_STATE } from "@/shared/assessment-state";
import type { Assessment, EvidencePoint } from "@/shared/contracts";
import { Icon } from "./icon";

function excerpt(text: string, limit: number) {
  if (text.length <= limit) return text;
  const end = text.lastIndexOf(" ", limit);
  return `${text.slice(0, end > limit / 2 ? end : limit)}…`;
}
function requirementTitle(point: EvidencePoint) {
  const quote = point.jdQuote ?? point.reason;
  const subjects: [RegExp, string][] = [
    [/at most|months of professional|years of experience/i, "Graduate experience"],
    [/degree|bachelor|master/i, "Degree qualification"],
    [/AI (?:development )?tools/i, "Working with AI tools"],
    [/code review|test|production|safe changes/i, "Code quality and safe changes"],
    [/team|collaborat|internship/i, "Project experience and teamwork"],
    [/java|python|ruby|scala|programming|typescript/i, "Programming skills"],
    [/problem.solv|data structure|algorithm/i, "Problem solving"],
  ];
  return subjects.find(([pattern]) => pattern.test(quote))?.[1] ?? excerpt(quote.replace(/^[-•]\s*/, ""), 76);
}
function Evidence({ title, points, gap = false }: { title: string; points: EvidencePoint[]; gap?: boolean }) {
  return <section className={`match-evidence-group ${gap ? "match-gaps" : ""}`}><h3>{title}</h3>{points.length ? <ul className="match-evidence-list">{points.map((point, index) => <li className="match-evidence-item" key={index}>
    <span className={`requirement-icon ${gap ? "gap-icon" : ""}`} aria-hidden="true">{gap ? "!" : <Icon name="check" size={12} />}</span>
    <div><h4>{requirementTitle(point)}{gap && !point.cvQuote ? <span className="evidence-missing"> · Not evidenced</span> : null}</h4>
      <p className="match-evidence-line"><b>JD:</b> {excerpt(point.jdQuote ?? "No quote returned.", 155)}</p>
      <p className="match-evidence-line"><b>CV evidence:</b> {point.cvQuote ? excerpt(point.cvQuote, 155) : "No supporting evidence found in the uploaded CV."}</p>
      <details className="supporting-details"><summary>Supporting details <Icon name="chevron" size={11} /></summary><div><p>{point.reason}</p><dl><dt>Job description</dt><dd>{point.jdQuote ? <q>{point.jdQuote}</q> : "Not provided."}</dd><dt>CV evidence</dt><dd>{point.cvQuote ? <q>{point.cvQuote}</q> : "Not evidenced in the saved CV; this does not establish that you lack the skill."}</dd></dl></div></details>
    </div>
  </li>)}</ul> : <p className="small-note">{gap ? "No specific gaps returned. Check the requirements yourself." : "No supported matches returned."}</p>}</section>;
}
export function AssessmentPanel({ jobId, profileReady, configured, initial, cvCard, uploading = false }: { jobId: string; profileReady: boolean; configured: boolean; initial: Assessment | null; cvCard?: ReactNode; uploading?: boolean }) {
  const [state, action, pending] = useActionState(assessJobAction, INITIAL_ASSESSMENT_STATE);
  const assessment = uploading ? null : state.assessment ?? initial;
  const output = assessment?.output;
  return <section className="panel assessment-panel" aria-busy={pending || uploading}>
    <div className="match-score-card"><strong>{output ? output.score === null ? "Match needs review" : `${output.score}% match` : uploading ? "Updating your CV…" : "Your CV match"}</strong><span>{output ? "Based on your saved CV and this job description" : profileReady ? "Ready to compare your CV with this role" : "Upload a CV to see your match"}</span></div>
    {cvCard}
    {output && assessment ? <div className="assessment-result">
      <Evidence title="Matched requirements" points={output.strengths} />
      <Evidence title="Gaps to review" points={output.gaps} gap />
      {output.unknowns.length ? <section className="match-evidence-group match-unknowns"><h3>Needs confirmation</h3><ul className="match-evidence-list">{output.unknowns.map((unknown, index) => <li className="match-evidence-item" key={index}><span className="requirement-icon gap-icon" aria-hidden="true">!</span><p>{unknown}</p></li>)}</ul></section> : null}
      <p className="match-caveat">Missing CV evidence does not necessarily mean missing skills. This score is a text-based estimate, not a hiring probability.</p>
      <details className="analysis-support"><summary>Supporting analysis <Icon name="chevron" size={12} /></summary><div><span className={`decision decision-${output.decision.toLowerCase()}`}>{output.decision === "YES" ? "Worth exploring" : output.decision === "NO" ? "Evidence suggests a mismatch" : "Needs your review"}</span><p>{output.reason}</p><p className="small-note assessment-provenance">{assessment.cached ? "Saved OpenRouter result" : "OpenRouter result"} · {assessment.modelId} · {assessment.promptVersion}<br />{new Date(assessment.createdAt).toISOString()}<br />Exact quotes were checked automatically; interpretation still needs human review.</p></div></details>
    </div> : uploading ? <p className="small-note" role="status">Reading your attachment. The new CV will need a new assessment.</p> : !profileReady ? <p className="small-note">{cvCard ? "Upload a PDF, DOCX or TXT attachment above to get started." : <Link href="/profile" className="inline-link">Save a CV and career direction first ↗</Link>}</p> : <div className="match-analysis-controls">
      <h3>Check this role</h3><p className="small-note">Get matching requirements, gaps and supporting CV/JD evidence.</p>
      {!configured ? <p className="small-note">AI is awaiting server configuration. Your CV has not been sent.</p> : null}
      <form action={action}><input type="hidden" name="jobId" value={jobId} /><label className="consent-label"><input type="checkbox" name="consent" value="yes" required disabled={pending} />I agree to send my saved CV, preferences and this job to OpenRouter for analysis.</label><p className="small-note">Use fictional details for this demo. No automatic requests.</p><button className="button" disabled={!configured || pending || (state.failed && !state.retryable)}>{pending ? "Analysing… (up to 20 seconds)" : state.failed && state.retryable ? "Retry once" : "Analyse this role"}</button></form>
    </div>}
    <div aria-live="polite" aria-atomic="true">{pending ? <p className="small-note">Comparing your CV with this job description…</p> : state.failed && state.message ? <p className="error-banner">{state.message}</p> : null}</div>
  </section>;
}
