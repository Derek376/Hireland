import { Workspace } from "@/components/workspace";
import { getWorkspaceData } from "@/server/workspace";
export default async function DiscoverPage({ searchParams }: { searchParams: Promise<{ q?: string | string[]; discussion?: string }> }) {
  const [result, params] = await Promise.all([getWorkspaceData(), searchParams]);
  if (!result.ok) return <p role="alert" className="error-banner">{result.error.message}</p>;
  return <Workspace data={result.value} view="discover" initialDiscussion={typeof params.discussion === "string" ? params.discussion : ""} initialQuery={typeof params.q === "string" ? params.q.slice(0, 120) : ""} />;
}
