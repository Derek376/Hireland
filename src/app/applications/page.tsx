import Link from "next/link";
import { APPLICATION_STATUSES } from "@/shared/contracts";
import { listApplications } from "@/server/applications";
import { listJobs } from "@/server/jobs";
import { ApplicationControls } from "@/components/application-forms";

export default async function ApplicationsPage() {
  const [applications, jobs] = await Promise.all([listApplications(), listJobs()]);
  if (!applications.ok || !jobs.ok) return <p className="error-banner" role="alert">{!applications.ok ? applications.error.message : !jobs.ok ? jobs.error.message : "Unable to load applications."}</p>;
  const jobMap = new Map(jobs.value.map(job => [job.id, job]));
  return <><div className="page-heading"><p className="eyebrow green">ONE PLACE FOR YOUR NEXT STEPS</p><h1>A little order.<br /><em>A lot of momentum.</em></h1><p className="muted">Your personal tracker. Status changes are your notes, not messages from employers.</p></div>
    <div className="status-summary">{APPLICATION_STATUSES.map(status => <div key={status}><strong>{applications.value.filter(application => application.status === status).length}</strong><span>{status}</span></div>)}</div>
    <div className="section-heading"><h2>Your applications</h2><Link href="/" className="inline-link">Find another role ↗</Link></div>
    {applications.value.length ? <div className="applications-list">{applications.value.map(application => {
      const job = jobMap.get(application.jobId);
      return <article className="application-card" key={application.id}><div className="application-copy"><span className="tag">Synthetic demo</span><p className="company-name">{job?.company ?? "Unavailable job"}</p><h3><Link href={`/jobs/${application.jobId}`}>{job?.title ?? "View job"}</Link></h3><p className="muted">{job?.location}</p><span className="status-pill">{application.status}</span></div><ApplicationControls application={application} /></article>;
    })}</div> : <div className="empty-state"><span aria-hidden="true">↗</span><h2>Your next chapter is unwritten.</h2><p>Save a role from its detail page to start tracking it here.</p><Link href="/" className="button">Explore demo roles</Link></div>}
  </>;
}
