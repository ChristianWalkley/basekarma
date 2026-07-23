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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
