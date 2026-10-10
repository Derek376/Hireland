import { Workspace } from "@/components/workspace";
import { getWorkspaceData } from "@/server/workspace";
export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ discussion?: string }> }) {
  const [result, params] = await Promise.all([getWorkspaceData(), searchParams]);
  if (!result.ok) return <p role="alert" className="error-banner">{result.error.message}</p>;
  return <Workspace data={result.value} view="tracker" initialDiscussion={typeof params.discussion === "string" ? params.discussion : ""} />;
}
