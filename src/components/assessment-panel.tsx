"use client";
import Link from "next/link";
import { useActionState } from "react";
import { assessJobAction } from "@/actions/assessments";
import { INITIAL_ASSESSMENT_STATE } from "@/shared/assessment-state";
import type { Assessment, EvidencePoint } from "@/shared/contracts";

function Evidence({ title, points }: { title: string; points: EvidencePoint[] }) {
  return <section className="evidence-group"><h3>{title}</h3>{points.length ? points.map((point, index) => <div className="evidence-point" key={index}><p>{point.reason}</p><dl><dt>CV evidence</dt><dd>{point.cvQuote ? <q>{point.cvQuote}</q> : "Not evidenced in the saved CV."}</dd><dt>Job evidence</dt><dd><q>{point.jdQuote}</q></dd></dl></div>) : <p className="small-note">No supported points returned.</p>}</section>;
}
export function AssessmentPanel({ jobId, profileReady, configured, initial }: { jobId: string; profileReady: boolean; configured: boolean; initial: Assessment | null }) {
  const [state, action, pending] = useActionState(assessJobAction, INITIAL_ASSESSMENT_STATE);
  const assessment = state.assessment ?? initial;
  const output = assessment?.output;
  return <section className="panel assessment-panel" aria-busy={pending}><p className="eyebrow green">YOUR CV + THIS ROLE</p><h2>Should you explore it?</h2><p>One AI assessment, with evidence you can check.</p>
    {!profileReady ? <p><Link href="/profile" className="inline-link">Save a CV and career direction first ↗</Link></p> : <>
      {!configured ? <p className="small-note">AI is awaiting server configuration. No CV will be sent until it is configured.</p> : null}
      <form action={action}><input type="hidden" name="jobId" value={jobId} /><label className="consent-label"><input type="checkbox" name="consent" value="yes" required disabled={pending} />I agree to send my saved CV, preferences and this job to OpenRouter if there is no saved result.</label><p className="small-note">Use the fictional CV for this demo. No automatic requests or retries. A failed request allows at most one manual retry.</p><button className="button" disabled={pending || (state.failed && !state.retryable)}>{pending ? "Analysing… (up to 20 seconds)" : state.failed && state.retryable ? "Retry once" : assessment ? "Show saved assessment" : "Analyse this role"}</button></form>
    </>}
    <div aria-live="polite" aria-atomic="true">{pending ? <p className="small-note">Comparing the saved inputs. You can still browse or use your tracker.</p> : state.message ? <p className={state.failed ? "error-banner" : "form-success"}>{state.message}</p> : null}</div>
    {assessment && output ? <div className="assessment-result"><div className="assessment-summary"><span className={`decision decision-${output.decision.toLowerCase()}`}>{output.decision === "YES" ? "Worth exploring" : output.decision === "NO" ? "Evidence suggests a mismatch" : "Needs your review"}</span><strong>{output.score === null ? "Score unavailable" : `${output.score}/100 skill match`}</strong></div><p>{output.reason}</p><p className="small-note">A heuristic based on these texts, not a hiring probability. Missing evidence does not mean you lack a skill. Check the quotes and practical requirements yourself.</p><Evidence title="Supported strengths" points={output.strengths} /><Evidence title="Gaps to investigate" points={output.gaps} /><section className="evidence-group"><h3>Still to confirm</h3>{output.unknowns.length ? <ul>{output.unknowns.map((unknown, index) => <li key={index}>{unknown}</li>)}</ul> : <p className="small-note">No unknowns returned. This does not verify the vacancy or your eligibility.</p>}</section><p className="small-note assessment-provenance">{assessment.cached ? "Saved OpenRouter result" : "OpenRouter result"} · {assessment.modelId} · {assessment.promptVersion}<br />{new Date(assessment.createdAt).toISOString()}<br />Exact quotes were checked automatically; interpretation still needs human review.</p></div> : null}
  </section>;
}
