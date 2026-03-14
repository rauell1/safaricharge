import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafariCharge - Solar Energy Dashboard",
  description: "Advanced solar energy simulation for Nairobi, Kenya",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
