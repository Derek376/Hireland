export interface FormState { status: "idle" | "success" | "error"; message: string }
export const INITIAL_FORM_STATE: FormState = { status: "idle", message: "" };
