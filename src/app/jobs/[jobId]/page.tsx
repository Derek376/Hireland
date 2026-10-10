import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob } from "@/server/jobs";
import { listApplications } from "@/server/applications";
import { SaveApplicationForm } from "@/components/application-forms";

const date = (timestamp: number | null) => timestamp === null ? "Not provided" : new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeZone: "UTC" }).format(timestamp);
export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const [result, applications] = await Promise.all([getJob(jobId), listApplications()]);
  if (!result.ok) {
    if (result.error.code === "NOT_FOUND") notFound();
    return <p role="alert" className="error-banner">{result.error.message}</p>;
  }
  const job = result.value;
  const saved = applications.ok && applications.value.some(application => application.jobId === jobId);
  return <><Link href="/" className="back-link">← Back to opportunities</Link><div className="detail-heading"><p className="eyebrow green">{job.company}</p><h1>{job.title}</h1><p className="muted">{job.location} · {job.category}</p><span className="tag">{job.sourceType === "synthetic" ? "Synthetic demo job" : "Public source"}</span></div>
    <div className="detail-layout"><section className="panel"><h2>The role, at a glance.</h2><p className="job-description">{job.description}</p><dl className="job-metadata"><div><dt>Availability</dt><dd>{job.status === "UNKNOWN" ? "Unknown — not verified" : job.status}</dd></div><div><dt>Publication date</dt><dd>{date(job.publishedAt)}{job.sourceType === "synthetic" && job.publishedAt !== null ? " (fictional)" : ""}</dd></div><div><dt>Last checked</dt><dd>{date(job.lastCheckedAt)}</dd></div><div><dt>Source</dt><dd>{job.sourceType === "synthetic" ? "Original fictional Hireland fixture" : job.sourceUrl}</dd></div></dl></section>
      <aside className="detail-sidebar"><section className="panel save-panel"><h2>Keep it on your radar.</h2><p>Save this role and keep track of your next step.</p>{!applications.ok ? <p role="alert" className="error-banner">{applications.error.message}</p> : <SaveApplicationForm jobId={job.id} saved={saved} />}<p className="small-note">Saving only adds a tracker record. It does not submit an application.</p>{job.sourceType === "synthetic" ? <p className="small-note">Fictional vacancy — no real application link.</p> : null}{job.status === "CLOSED" ? <p className="small-note">This fixture is closed. You can save it as a tracking example.</p> : null}</section><section className="side-note compact"><p className="eyebrow green">AI ASSESSMENT · NOT AVAILABLE YET</p><h2>A clearer decision.</h2><p>CV matching and evidence-based application advice will appear here when assessment is available.</p><Link href="/profile" className="inline-link">Prepare your profile ↗</Link></section></aside>
    </div>
  </>;
}
