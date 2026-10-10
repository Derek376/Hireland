import "server-only";
import { createHash } from "node:crypto";
import type { Category, Profile, Result } from "../shared/contracts.ts";
import { getDatabase, transaction } from "./db.ts";
import { getCurrentDemoUser } from "./identity.ts";
import { databaseResult, failure, success } from "./results.ts";

// Monotonic within this process, including clear + immediately resave of identical text.
const profileClock = globalThis as typeof globalThis & { hirelandProfileClock?: number };
const categories: Category[] = ["Technology", "Finance", "Consulting", "Other"];
export async function getProfile(): Promise<Result<Profile | null>> {
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const row = getDatabase().prepare("SELECT cv_text,preferences_json,updated_at FROM profiles WHERE user_id=?").get(user.id) as { cv_text: string; preferences_json: string; updated_at: number } | undefined;
    return success(row ? { cvText: row.cv_text, preferences: JSON.parse(row.preferences_json) as Category[], updatedAt: row.updated_at } : null);
  });
}
export async function saveProfile(input: { cvText: string; preferences: Category[] }): Promise<Result<Profile>> {
  if (typeof input.cvText !== "string" || !input.cvText.trim()) return failure("VALIDATION", "Add CV text before saving your profile.");
  if (input.cvText.length > 12000) return failure("VALIDATION", "Your CV must be 12,000 characters or fewer. Please shorten it rather than losing text.");
  if (!Array.isArray(input.preferences) || !input.preferences.length || input.preferences.some(value => !categories.includes(value))) return failure("VALIDATION", "Choose at least one valid career direction.");
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const cvText = input.cvText.trim().replace(/\r\n?/g, "\n");
    const preferences = categories.filter(category => input.preferences.includes(category));
    const existing = getDatabase().prepare("SELECT updated_at FROM profiles WHERE user_id=?").get(user.id)?.updated_at as number | undefined;
    const updatedAt = Math.max(Date.now(), (existing ?? 0) + 1, (profileClock.hirelandProfileClock ?? 0) + 1);
    profileClock.hirelandProfileClock = updatedAt;
    getDatabase().prepare("INSERT INTO profiles VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET cv_text=excluded.cv_text,cv_hash=excluded.cv_hash,preferences_json=excluded.preferences_json,updated_at=excluded.updated_at")
      .run(user.id, cvText, createHash("sha256").update(cvText).digest("hex"), JSON.stringify(preferences), updatedAt);
    return success({ cvText, preferences, updatedAt });
  });
}
export async function clearProfile(): Promise<Result<void>> {
  return databaseResult(async () => {
    const user = await getCurrentDemoUser();
    const db = getDatabase();
    transaction(db, () => {
      db.prepare("DELETE FROM assessments WHERE user_id=?").run(user.id);
      db.prepare("DELETE FROM profiles WHERE user_id=?").run(user.id);
    });
    return success(undefined);
  });
}
