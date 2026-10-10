import "server-only";
import type { Result } from "../shared/contracts.ts";
import type { WorkspaceData, WorkspaceJob } from "../shared/workspace.ts";
import { listJobs } from "./jobs.ts";
import { listApplications, listApplicationHistory } from "./applications.ts";
import { getTopicForJob, getTopicComments } from "./community.ts";
import { getAssessmentView } from "./assessments.ts";
import { stripeClient } from "./providers/stripe.ts";
import { success } from "./results.ts";

// Read-only view data. Opening a list or panel never calls AI or creates a payment.
export async function getWorkspaceData(): Promise<Result<WorkspaceData>> {
  const [jobs, applications, history] = await Promise.all([listJobs(), listApplications(), listApplicationHistory()]);
  if (!jobs.ok) return jobs;
  if (!applications.ok) return applications;
  if (!history.ok) return history;
  const rows: WorkspaceJob[] = await Promise.all(jobs.value.map(async job => {
    const [topic, assessment] = await Promise.all([getTopicForJob(job.id), getAssessmentView(job.id)]);
    const comments = topic.ok ? await getTopicComments(topic.value.id) : topic;
    const application = applications.value.find(item => item.jobId === job.id) ?? null;
    return {
      job, application, applicationHistory: application ? history.value.filter(event => event.applicationId === application.id) : [],
      // Only the server-authorized preview is serialized, including for closed panels.
      topic: comments.ok ? comments.value : null, communityError: comments.ok ? null : comments.error.message,
      assessment: assessment.ok ? assessment.value.assessment : null,
      assessmentKey: assessment.ok ? assessment.value.key : "unavailable",
      assessmentError: assessment.ok ? null : assessment.error.message,
      profileReady: assessment.ok && assessment.value.profileReady,
      aiConfigured: assessment.ok && assessment.value.configured,
    };
  }));
  return success({ jobs: rows, stripeConfigured: !!stripeClient() });
}
