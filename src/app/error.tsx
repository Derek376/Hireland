"use client";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="empty-state" role="alert"><h2>Let's try that again.</h2><p>We couldn't load this page. Please retry, or check that the local database is accessible.</p><button className="button" onClick={() => reset()}>Try again</button></div>;
}
