"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { WorkspaceData, WorkspaceJob } from "@/shared/workspace";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/shared/contracts";
import { Icon } from "./icon";
import { CompanyLogo } from "./company-logo";
import { SaveApplicationForm } from "./application-forms";
import { TrackerStatus, TrackerHistory, RemoveFromTracker } from "./tracker-controls";
import { AssessmentPanel } from "./assessment-panel";
import { CommunityPreview } from "./community-preview";
import { statusLabel } from "@/shared/application-display";
const nextStep: Record<ApplicationStatus, string> = { SAVED: "Review the role", APPLIED: "Track your progress", INTERVIEW: "Prepare for interview", OFFER: "Review your offer", REJECTED: "Plan your next step" };
type Panel = { kind: "match" | "community"; jobId: string } | null;
export function Workspace({ data, view, initialQuery = "", initialDiscussion = "" }: { data: WorkspaceData; view: "discover" | "tracker"; initialQuery?: string; initialDiscussion?: string }) {
  const tracker = view === "tracker";
  const [query, setQuery] = useState(initialQuery);
  const [location, setLocation] = useState("");
  const [sector, setSector] = useState("");
  const [filters, setFilters] = useState({ query: initialQuery, location: "", sector: "" });
  const [sort, setSort] = useState("newest");
  const [limit, setLimit] = useState(6);
  const [stage, setStage] = useState("all");
  const [panel, setPanel] = useState<Panel>(initialDiscussion ? { kind: "community", jobId: initialDiscussion } : null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const current = data.jobs.find(row => row.job.id === panel?.jobId);
  function close() { setPanel(null); opener.current?.focus(); }
  useEffect(() => {
    if (!panel) return;
    closeButton.current?.focus({ preventScroll: true });
    if (window.matchMedia("(max-width: 760px)").matches) closeButton.current?.scrollIntoView({ block: "start", behavior: "instant" });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setPanel(null); opener.current?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [panel?.jobId, panel?.kind]);
  function open(kind: "match" | "community", row: WorkspaceJob, button: HTMLButtonElement) {
    opener.current = button;
    setPanel(previous => previous?.kind === kind && previous.jobId === row.job.id ? null : { kind, jobId: row.job.id });
  }
  const available = tracker ? data.jobs.filter(row => row.application) : data.jobs;
  const search = (tracker ? query : filters.query).trim().toLowerCase();
  const filtered = available.filter(({ job, application }) =>
    (!search || `${job.company} ${job.title} ${job.location}`.toLowerCase().includes(search)) &&
    (tracker ? stage === "all" || application?.status === stage : (!filters.location || job.location === filters.location) && (!filters.sector || job.category === filters.sector)))
    .sort((a, b) => sort === "company" ? a.job.company.localeCompare(b.job.company) :
      tracker ? (b.application?.updatedAt ?? 0) - (a.application?.updatedAt ?? 0) : (b.job.listedAt ?? b.job.publishedAt ?? b.job.lastCheckedAt ?? 0) - (a.job.listedAt ?? a.job.publishedAt ?? a.job.lastCheckedAt ?? 0));
  const visible = tracker ? filtered : filtered.slice(0, limit);
  return <div className={`workspace ${panel && current ? "has-panel" : ""}`}>
    <section className="workspace-content">
      <div className="workspace-heading"><div><h1>{tracker ? "My Tracker" : "Find your next opportunity"}</h1><p>{tracker ? "Your next step, in one place." : "Explore graduate roles and see how your CV fits."}</p></div>{tracker ? <span className="heading-count">{available.length} saved {available.length === 1 ? "role" : "roles"}</span> : null}</div>
      {tracker ? <><div className="tracker-tabs" aria-label="Filter by application status"><button className={stage === "all" ? "selected" : ""} aria-pressed={stage === "all"} onClick={() => setStage("all")}>All <span>{available.length}</span></button>{APPLICATION_STATUSES.map(status => <button key={status} className={stage === status ? "selected" : ""} aria-pressed={stage === status} onClick={() => setStage(status)}>{statusLabel[status]}<span>{available.filter(row => row.application?.status === status).length}</span></button>)}</div><label className="tracker-search"><Icon name="search" /><input type="search" maxLength={120} placeholder="Search applications…" aria-label="Search applications" value={query} onChange={event => setQuery(event.target.value)} /></label></> : <form className="job-filters" onSubmit={event => { event.preventDefault(); setFilters({ query, location, sector }); setLimit(6); }}>
        <label><span>Job title or company</span><div className="filter-input"><Icon name="search" /><input type="search" aria-label="Job title or company" maxLength={120} placeholder="Search by name" value={query} onChange={event => setQuery(event.target.value)} /></div></label>
        <label><span>Location</span><div className="filter-input"><Icon name="pin" /><select aria-label="Location" value={location} onChange={event => setLocation(event.target.value)}><option value="">All locations</option>{[...new Set(data.jobs.map(row => row.job.location))].sort().map(item => <option key={item}>{item}</option>)}</select></div></label>
        <label><span>Industry sector</span><div className="filter-input"><Icon name="building" /><select aria-label="Industry sector" value={sector} onChange={event => setSector(event.target.value)}><option value="">All sectors</option>{[...new Set(data.jobs.map(row => row.job.category))].sort().map(item => <option key={item}>{item}</option>)}</select></div></label><button className="button search-button">Search</button>
      </form>}
      <div className="listing-heading"><div><h2>{tracker ? "Your applications" : "Open positions"}</h2><span>{filtered.length} {tracker ? "applications" : "roles"}{!tracker ? " · Check current availability with the employer" : ""}</span></div>{!tracker ? <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort roles"><option value="newest">Newest first</option><option value="company">Company A–Z</option></select> : <Link href="/" className="inline-link">Find more roles <Icon name="arrow" /></Link>}</div>
      <p className="demo-banner"><Icon name="sparkle" />Public listings link to employers; fictional roles are labelled. CV scores use saved assessments. Saving a role does not submit an application.</p>
      {tracker && visible.length ? <div className="tracker-columns" aria-hidden="true"><span>Company / Role</span><span>Stage</span><span>Next step</span><span>Community</span></div> : null}
      <div className={tracker ? "tracker-list" : "role-list"}>{visible.map(row => <article key={row.job.id} className={`${tracker ? "tracker-row" : "role-row"} ${row.job.id === panel?.jobId ? "row-selected" : ""}`}>
        <div className="role-identity"><CompanyLogo company={row.job.company} /><div><strong>{row.job.company}</strong><Link href={`/jobs/${row.job.id}`} className="role-title">{row.job.title}</Link><span>{row.job.location} · {row.job.category}</span></div></div>
        {tracker && row.application ? <><TrackerStatus application={row.application} role={row.job.title} /><div className="next-step"><strong>{nextStep[row.application.status]}</strong><span>Updated {new Intl.DateTimeFormat("en-IE", { month: "short", day: "numeric", timeZone: "UTC" }).format(row.application.updatedAt)}</span></div><button className="community-link" onClick={event => open("community", row, event.currentTarget)} aria-expanded={panel?.jobId === row.job.id && panel.kind === "community"}><Icon name="chat" />View community<Icon name="chevron" style={{ transform: "rotate(-90deg)" }} /></button><div className="tracker-row-footer"><TrackerHistory events={row.applicationHistory} /><RemoveFromTracker application={row.application} role={row.job.title} /></div></> : <>
          <div className="role-dates"><span>{row.job.listedAt != null ? `Added ${new Intl.DateTimeFormat("en-IE", { month: "short", day: "numeric", timeZone: "UTC" }).format(row.job.listedAt)}` : row.job.publishedAt === null ? "Posted date not provided" : `Posted ${new Intl.DateTimeFormat("en-IE", { month: "short", day: "numeric", timeZone: "UTC" }).format(row.job.publishedAt)}${row.job.sourceType === "synthetic" ? " · demo" : ""}`}</span><strong className={row.job.status === "CLOSED" ? "closed-label" : ""}>{row.job.status === "CLOSED" ? row.job.sourceType === "synthetic" ? "Closed fixture" : "Closed" : "No deadline listed"}</strong></div>
          <button className={`match-chip ${row.assessment?.output.score != null ? "has-match" : ""}`} onClick={event => open("match", row, event.currentTarget)} aria-label={`Check CV match for ${row.job.company} ${row.job.title}`} aria-expanded={panel?.jobId === row.job.id && panel.kind === "match"}><Icon name={row.assessment?.output.score != null ? "check" : "sparkle"} size={14} />{row.assessment?.output.score != null ? `${row.assessment.output.score}% CV match` : "Check CV match"}</button>
          <SaveApplicationForm jobId={row.job.id} saved={!!row.application} compact />
          <button className="discussion-button" onClick={event => open("community", row, event.currentTarget)} aria-label={`Open discussions for ${row.job.company} ${row.job.title}`} aria-expanded={panel?.jobId === row.job.id && panel.kind === "community"}><Icon name="chat" />Discussions</button>{row.job.sourceType === "public" && row.job.applyUrl ? <a className="button view-job" href={row.job.applyUrl}>View job</a> : <Link className="button view-job" href={`/jobs/${row.job.id}`}>View job</Link>}
        </>}
      </article>)}</div>
      {!visible.length ? <div className="empty-state"><Icon name={tracker ? "bookmark" : "search"} size={32} /><h2>{tracker && !available.length ? "Your tracker starts here." : "No matching roles."}</h2><p>{tracker && !available.length ? "Save a job to keep its progress and community together." : "Try another search or filter."}</p>{tracker && !available.length ? <Link className="button" href="/">Find jobs</Link> : <button className="button secondary" onClick={() => { setQuery(""); setLocation(""); setSector(""); setFilters({ query: "", location: "", sector: "" }); setStage("all"); }}>Clear filters</button>}</div> : null}
      {!tracker && filtered.length ? <div className="list-footer"><span>Showing {visible.length} of {filtered.length} roles</span>{limit < filtered.length ? <button className="button secondary load-more" onClick={() => setLimit(limit + 6)}>Load more <Icon name="chevron" /></button> : <span>All roles shown</span>}</div> : null}
    </section>
    {panel && current ? <aside className="workspace-panel" aria-labelledby="workspace-panel-title"><div className="panel-heading"><div><h2 id="workspace-panel-title">{panel.kind === "match" ? "CV Match Profile" : "Discussions"}</h2>{panel.kind === "match" ? <p>{current.job.company} · {current.job.title}</p> : null}</div><button className="icon-button panel-close" ref={closeButton} onClick={close} aria-label="Close side panel"><Icon name="close" size={20} /></button></div>
      {panel.kind === "match" ? <><div className="cv-profile-note"><Icon name="file" size={23} /><div><strong>{current.profileReady ? "Your saved CV" : "No CV saved yet"}</strong><span>{current.profileReady ? "Evidence from your saved profile" : "Add a fictional CV to get started"}</span></div><Link href="/profile" className="button secondary">{current.profileReady ? "Update CV" : "Add CV"}</Link></div>{current.assessmentError ? <p role="alert" className="error-banner">{current.assessmentError}</p> : <AssessmentPanel key={`${current.job.id}:${current.assessmentKey}`} jobId={current.job.id} initial={current.assessment} configured={current.aiConfigured} profileReady={current.profileReady} />}</> : <><div className="panel-company"><CompanyLogo company={current.job.company} /><div><strong>{current.job.company}</strong><span>{current.job.title}</span><p><Icon name={current.topic?.unlocked ? "check" : "gift"} size={13} />{current.topic?.unlocked ? "Access unlocked" : "Free preview"} · {current.job.sourceType === "synthetic" ? "Fictional demo" : "Public vacancy"}</p></div></div>{current.topic ? <CommunityPreview key={current.topic.topicId} topic={current.topic} configured={data.stripeConfigured} tracker={tracker} /> : <p role="alert" className="error-banner">{current.communityError ?? "No discussion available yet."}</p>}</>}
    </aside> : null}
  </div>;
}
