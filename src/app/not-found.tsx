import Link from "next/link";
export default function NotFound() {
  return <div className="empty-state"><p className="eyebrow green">404 · A SMALL DETOUR</p><h1>This page couldn't be found.</h1><p>The role or page may not exist in this demo. Your saved records are still in your tracker.</p><Link href="/" className="button">Back to opportunities</Link></div>;
}
