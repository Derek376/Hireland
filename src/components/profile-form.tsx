"use client";

import { startTransition, useActionState, useState } from "react";
import type { Category, Profile } from "@/shared/contracts";
import { INITIAL_FORM_STATE, type FormState } from "@/shared/form-state";
import { profileAction } from "@/actions/profile";
import { FormMessage } from "./form-message";

const directions: Category[] = ["Technology", "Finance", "Consulting", "Other"];
export function ProfileForm({ profile, demoCv }: { profile: Profile | null; demoCv: string }) {
  const [cvText, setCvText] = useState(profile?.cvText ?? "");
  const [preferences, setPreferences] = useState<Category[]>(profile?.preferences ?? ["Technology"]);
  const [state, action, pending] = useActionState(async (previous: FormState, data: FormData) => {
    const result = await profileAction(previous, data);
    if (result.status === "success" && data.get("intent") === "clear") {
      setCvText("");
      setPreferences(["Technology"]);
    }
    return result;
  }, INITIAL_FORM_STATE);
  return <form action={action} className="profile-form" onSubmit={event => {
    // Preserve the controlled draft instead of React's successful-action native reset.
    event.preventDefault();
    const data = new FormData(event.currentTarget, (event.nativeEvent as SubmitEvent).submitter);
    if (!data.has("intent")) data.set("intent", "save");
    startTransition(() => action(data));
  }}>
    <fieldset disabled={pending} className="plain-fieldset">
      <div className="section-heading"><div><h2>Your CV, in your words.</h2><p className="muted">Paste text or try our completely fictional sample.</p></div>
        <button type="button" className="button secondary" onClick={() => { setCvText(demoCv); setPreferences(["Technology"]); }}>Load fictional CV</button></div>
      <label htmlFor="cvText">CV text</label>
      <textarea id="cvText" name="cvText" rows={17} maxLength={12000} value={cvText} onChange={event => setCvText(event.target.value)} aria-describedby="cv-help" placeholder="Education, projects, skills and experience…" />
      <p id="cv-help" className="input-hint">{cvText.length.toLocaleString()} / 12,000 characters · Stored on this demo machine. Use fictional details.</p>
      <fieldset className="direction-fieldset"><legend>Career directions</legend><div className="checkboxes">{directions.map(direction => <label key={direction}><input type="checkbox" name="preferences" value={direction} checked={preferences.includes(direction)} onChange={event => setPreferences(event.target.checked ? [...preferences, direction] : preferences.filter(value => value !== direction))} />{direction}</label>)}</div></fieldset>
      <div className="form-buttons"><button type="submit" name="intent" value="save" className="button">{pending ? "Saving…" : "Save profile"}</button><button type="submit" name="intent" value="clear" className="text-button danger" formNoValidate>Clear saved profile</button></div>
    </fieldset>
    <FormMessage state={state} />
  </form>;
}
