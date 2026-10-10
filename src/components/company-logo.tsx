import Image from "next/image";

export function CompanyLogo({ company }: { company: string }) {
  const name = company.toLowerCase();
  if (name.includes("microsoft")) return <span className="company-logo microsoft" aria-hidden="true"><i /><i /><i /><i /></span>;
  if (name.includes("google")) return <span className="company-logo google" aria-hidden="true">G</span>;
  if (name.includes("amazon")) return <span className="company-logo amazon" aria-hidden="true">a<svg viewBox="0 0 40 12"><path d="M5 3c10 7 21 7 29 0m-5 0h5v5" fill="none" stroke="#ff9900" strokeWidth="2.5" strokeLinecap="round" /></svg></span>;
  if (name === "stripe") return <span className="company-logo stripe" aria-hidden="true"><Image src="/logos/stripe.svg" alt="" width={34} height={15} /></span>;
  return <span className={`company-logo ${name.includes("hubspot") ? "hubspot" : "generic"}`} aria-hidden="true">{company[0]?.toUpperCase()}</span>;
}
