import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ProfileForm } from "@/components/profile-form";
import { getProfile } from "@/server/profile";

export default async function ProfilePage() {
  const result = await getProfile();
  const demoCv = readFileSync(resolve(process.cwd(), "data/seed/demo-cv.txt"), "utf8");
  return <><div className="page-heading"><p className="eyebrow green">A LITTLE ABOUT YOU</p><h1>Your next step,<br /><em>on your terms.</em></h1><p className="muted">Keep your CV and career directions together. Ready when you are.</p></div>
    <div className="profile-layout"><section className="panel">{result.ok ? <ProfileForm profile={result.value} demoCv={demoCv} /> : <p role="alert" className="error-banner">{result.error.message}</p>}</section><aside className="side-note"><span className="note-star" aria-hidden="true">✳</span><h2>Start with a sample.</h2><p>Use our fictional CV to explore the prototype without sharing personal information.</p><hr /><h3>What happens to your text?</h3><p>Your text is saved locally. No AI request is made yet. When assessment is available, it will send your CV and a job description to OpenRouter.</p><p className="small-note">This is a shared demo identity on this machine. It is not a private, authenticated account.</p></aside></div>
  </>;
}
