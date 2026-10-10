import Link from "next/link";
import type { Job } from "@/shared/contracts";

export function JobCard({ job, saved }: { job: Job; saved: boolean }) {
  return <article className="job-card">
    <div className="job-card-top"><span className="company-mark" aria-hidden="true">{job.company[0]}</span><span className="tag">Synthetic demo</span></div>
    <p className="company-name">{job.company}</p><h3><Link href={`/jobs/${job.id}`}>{job.title}</Link></h3>
    <p className="muted job-location">{job.location}</p>
    <div className="job-card-bottom"><span className={`availability ${job.status === "CLOSED" ? "closed" : ""}`}>{job.status === "CLOSED" ? "Closed fixture" : job.status === "UNKNOWN" ? "Availability unknown" : "Open fixture"}</span>{saved ? <span className="saved-label">✓ Saved</span> : <Link className="inline-link" href={`/jobs/${job.id}`}>View job ↗</Link>}</div>
  </article>;
}
