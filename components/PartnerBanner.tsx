"use client";

import { usePathname } from "next/navigation";

export function PartnerBanner() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname === "/signup" || pathname === "/about") {
    return null;
  }

  return (
    <a
      className="partner-banner"
      href="https://rbautotrade.com/"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="partner-banner-main">
        <strong>KOREA AUTO TRADE</strong>
      </span>
      <span className="partner-banner-cta">Visit site</span>
    </a>
  );
}
