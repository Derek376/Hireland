import Link from "next/link";
import { JobCard } from "@/components/job-card";
import { listJobs } from "@/server/jobs";
import { getProfile } from "@/server/profile";
import { listApplications } from "@/server/applications";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const [jobs, profile, applications] = await Promise.all([listJobs({ query }), getProfile(), listApplications()]);
  const saved = new Set(applications.ok ? applications.value.map(application => application.jobId) : []);
  return <>
    <section className="hero"><div className="hero-copy"><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h1>Less searching.<br />More <em>possibility.</em></h1><p className="hero-description">Graduate and junior roles in Ireland, with a little more clarity and a lot less spreadsheet juggling.</p><div className="hero-links"><a href="#jobs" className="button">Explore the roles <span aria-hidden="true">↘</span></a><Link href="/profile" className="hero-text-link">{profile.ok && profile.value ? "Edit your profile" : "Set up your profile"} ↗</Link></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="art-star">✳</span><div className="art-note"><span>A small step today.</span><strong>A new chapter tomorrow.</strong></div></div></section>
    <aside className="demo-notice"><span className="notice-dot" /><p><strong>A transparent demo.</strong> Every listing below is fictional. No real vacancies or applications. Open a role to compare it with your saved CV using OpenRouter.</p></aside>
    <section id="jobs" className="jobs-section"><div className="section-heading"><div><p className="eyebrow green">THE OPPORTUNITIES</p><h2>Find a place to begin.</h2></div><span className="count-label">{jobs.ok ? `${jobs.value.length} demo roles` : "Roles unavailable"}</span></div>
      <form className="search-form" action="/" method="get"><label htmlFor="job-search" className="sr-only">Search roles, companies or locations</label><span aria-hidden="true">⌕</span><input id="job-search" type="search" name="q" maxLength={120} defaultValue={query} placeholder="Search roles, companies or locations…" /><button className="button">Search</button>{query ? <Link className="inline-link" href="/">Clear search</Link> : null}</form>
      {!profile.ok ? <p role="alert" className="error-banner">{profile.error.message}</p> : null}
      {!applications.ok ? <p role="alert" className="error-banner">{applications.error.message}</p> : null}
      {!jobs.ok ? <p role="alert" className="error-banner">{jobs.error.message}</p> : jobs.value.length ? <div className="job-grid">{jobs.value.map(job => <JobCard key={job.id} job={job} saved={saved.has(job.id)} />)}</div> : <div className="empty-state"><span aria-hidden="true">↗</span><h3>No roles found{query ? ` for “${query}”` : " yet"}.</h3><p>{query ? "Try a broader keyword, company or Irish city." : "Run npm run db:setup to add the fictional demo roles."}</p>{query ? <Link href="/" className="button secondary">Show all roles</Link> : null}</div>}
    </section>
  </>;
}
