import "server-only";
import { DEMO_USER_ID } from "../shared/contracts.ts";

export async function getCurrentDemoUser(): Promise<{ id: typeof DEMO_USER_ID; demoName: string }> {
  return { id: DEMO_USER_ID, demoName: "Demo Student" };
}
