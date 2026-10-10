import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import "./globals.css";

export const metadata: Metadata = { title: "Hireland — a little clarity for your next step", description: "Discover fictional graduate roles, prepare your profile and keep your job search in one place." };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header"><div className="header-inner"><Link href="/" className="brand" aria-label="Hireland home"><span className="brand-symbol" aria-hidden="true">h.</span>hireland<span className="brand-dot">✳</span></Link><Navigation /><span className="demo-user"><span className="user-dot" />Demo Student</span></div></header>
    <main id="main" className="main-shell">{children}</main>
    <footer className="site-footer"><span>hireland · built for your next chapter</span><span>HackUCD prototype · Fictional data · Local demo user</span></footer>
  </body></html>;
}
