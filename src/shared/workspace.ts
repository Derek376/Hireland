import type { Application, Assessment, Job, TopicComments } from "./contracts.ts";
export interface WorkspaceJob {
  job: Job;
  application: Application | null;
  topic: TopicComments | null;
  communityError: string | null;
  assessment: Assessment | null;
  assessmentKey: string;
  assessmentError: string | null;
  profileReady: boolean;
  aiConfigured: boolean;
}
export interface WorkspaceData { jobs: WorkspaceJob[]; stripeConfigured: boolean }
