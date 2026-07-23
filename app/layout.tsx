import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BaseKarma",
  description: "Send good vibes on Base."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="base:app_id" content="6a617bf4426d14cfbad57a16" />
        <meta
          name="talentapp:project_verification"
          content="0f9dc26d4b198cc1bd07115b35657f62ccec45060d0aac179479df8f689d6b7f76b165f8c8ed9c130ff3185dc34097be9862bad827d7fd922907c7d59190636f"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
