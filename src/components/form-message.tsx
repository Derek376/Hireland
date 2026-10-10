import type { FormState } from "@/shared/form-state";

export function FormMessage({ state }: { state: FormState }) {
  return <p className={`form-message ${state.status}`} role={state.status === "error" ? "alert" : "status"} aria-live="polite">{state.message}</p>;
}
