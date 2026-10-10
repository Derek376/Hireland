import "server-only";
import type { ErrorCode, Result } from "../shared/contracts.ts";

export const success = <T>(value: T): Result<T> => ({ ok: true, value });
export const failure = (code: ErrorCode, message: string, retryable = false): Result<never> => ({ ok: false, error: { code, message, retryable } });
export async function databaseResult<T>(work: () => Promise<Result<T>>): Promise<Result<T>> {
  try { return await work(); }
  catch {
    // Do not include SQL values, CV content or local paths in public errors.
    console.error("Hireland database operation failed");
    return failure("PERSISTENCE_ERROR", "We couldn't access your local data. Please try again or check the server terminal.", true);
  }
}
export function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9:_-]{1,100}$/.test(value);
}
