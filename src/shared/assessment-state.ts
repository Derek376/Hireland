import type { Assessment } from "./contracts.ts";
export interface AssessmentState { assessment: Assessment | null; message: string; retryable: boolean; failed: boolean }
export const INITIAL_ASSESSMENT_STATE: AssessmentState = { assessment: null, message: "", retryable: false, failed: false };
