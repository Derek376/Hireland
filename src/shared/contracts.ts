// M0 contracts only. M1/M2/M3 implement these inside the same server process.
export const DEMO_USER_ID = "demo-user";
export const APPLICATION_STATUSES = ["SAVED", "APPLIED", "INTERVIEW", "OFFER", "REJECTED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type Category = "Technology" | "Finance" | "Consulting" | "Other";
export type Decision = "YES" | "NO" | "NEEDS_REVIEW";
export type ErrorCode = "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "NOT_CONFIGURED" | "BUSY" | "PROVIDER_TIMEOUT" | "PROVIDER_ERROR" | "INVALID_OUTPUT" | "PERSISTENCE_ERROR";
export type Result<T> = { ok: true; value: T } | { ok: false; error: { code: ErrorCode; message: string; retryable: boolean } };

export interface Job {
  id: string;
  jobKey: string;
  company: string;
  title: string;
  location: string;
  category: Category;
  description: string;
  sourceType: "synthetic" | "public";
  sourceUrl: string | null;
  applyUrl: string | null;
  publishedAt: number | null;
  lastCheckedAt: number | null;
  status: "OPEN" | "CLOSED" | "UNKNOWN";
}
export interface Profile { cvText: string; preferences: Category[]; updatedAt: number }
export interface Application { id: string; jobId: string; status: ApplicationStatus; createdAt: number; updatedAt: number }
export interface ApplicationStatusEvent {
  id: number;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  kind: "CREATED" | "BASELINE" | "CHANGED";
  createdAt: number;
}
export interface EvidencePoint { reason: string; cvQuote: string | null; jdQuote: string | null }
export interface AssessmentOutput {
  decision: Decision;
  score: number | null;
  reason: string;
  strengths: EvidencePoint[];
  gaps: EvidencePoint[];
  unknowns: string[];
}
export interface Assessment { id: string; jobId: string; modelId: string; promptVersion: string; createdAt: number; cached: boolean; output: AssessmentOutput }
export interface Comment { id: string; authorLabel: string; body: string; isSynthetic: boolean; createdAt: number }
export interface TopicComments { topicId: string; comments: Comment[]; totalCount: number; unlocked: boolean }
export type Fulfillment = { status: "UNLOCKED" | "PENDING"; topicId: string };

// Implementations get identity server-side. These are internal functions, not REST contracts.
// getTopicComments must never include unauthorized comment bodies in its returned value.
export interface HirelandServices {
  getCurrentDemoUser(): Promise<{ id: typeof DEMO_USER_ID; demoName: string }>;
  listJobs(input?: { query?: string }): Promise<Result<Job[]>>;
  getJob(jobId: string): Promise<Result<Job>>;
  getProfile(): Promise<Result<Profile | null>>;
  saveProfile(input: { cvText: string; preferences: Category[] }): Promise<Result<Profile>>;
  clearProfile(): Promise<Result<void>>;
  assessJob(jobId: string): Promise<Result<Assessment>>;
  listApplications(): Promise<Result<Application[]>>;
  listApplicationHistory(): Promise<Result<ApplicationStatusEvent[]>>;
  saveApplication(jobId: string): Promise<Result<Application>>;
  updateApplication(applicationId: string, status: ApplicationStatus): Promise<Result<Application>>;
  deleteApplication(applicationId: string): Promise<Result<void>>;
  getTopicForJob(jobId: string): Promise<Result<{ id: string; jobId: string }>>;
  getTopicComments(topicId: string): Promise<Result<TopicComments>>;
  addComment(topicId: string, body: string): Promise<Result<TopicComments>>;
  createCheckout(topicId: string): Promise<Result<{ url: string }>>;
  // Called only after server-side ownership check (return) or signature check (webhook).
  fulfillCheckout(sessionId: string): Promise<Result<Fulfillment>>;
}
