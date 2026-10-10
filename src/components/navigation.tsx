"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [{ href: "/", label: "Find jobs" }, { href: "/applications", label: "My Tracker" }];
export function Navigation() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation">{links.map(link => {
    const active = link.href === "/" ? pathname === "/" || pathname.startsWith("/jobs/") || pathname.startsWith("/topics/") : pathname === link.href;
    return <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={active ? "active" : ""}>{link.label}</Link>;
  })}</nav>;
}
