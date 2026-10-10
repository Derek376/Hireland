import type { ApplicationStatus } from "./contracts.ts";
export const statusLabel: Record<ApplicationStatus, string> = {
  SAVED: "Saved", APPLIED: "Applied", INTERVIEW: "Interview", OFFER: "Offer", REJECTED: "Rejected",
};
