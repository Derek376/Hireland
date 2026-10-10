import type { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/navigation";
import { Icon } from "@/components/icon";
import "./globals.css";
export const metadata: Metadata = { title: "Hireland — find your next opportunity", description: "Find graduate roles, compare your CV and keep your applications in one place. A transparent student prototype." };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header"><div className="header-inner"><Link href="/" className="brand" aria-label="Hireland home">Hireland</Link><Navigation />
      <details className="account-menu"><summary><span className="avatar">D</span><span>Demo Student</span><Icon name="chevron" size={14} /></summary><div className="account-links"><Link href="/profile">My CV & preferences</Link><Link href="/applications">My Tracker</Link><p>Local demo identity</p></div></details>
    </div></header>
    <main id="main" className="main-shell">{children}</main>
    <footer className="site-footer"><span>Hireland · Your next step, in one place.</span><span>HackUCD prototype · Public listings and fictional demos · Community reports are unverified.</span></footer>
  </body></html>;
}
