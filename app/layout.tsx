import type { Metadata } from "next";
import "./globals.css";
import { PartnerBanner } from "@/components/PartnerBanner";

export const metadata: Metadata = {
  title: "KOREA AUTO AUTION",
  description: "Simple timed vehicle auctions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap"
        />
      </head>
      <body>
        <PartnerBanner />
        {children}
      </body>
    </html>
  );
}
