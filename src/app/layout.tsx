import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SafariCharge — Solar Energy Dashboard",
  description:
    "Advanced solar energy simulation, battery management and financial analysis for Nairobi, Kenya.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", type: "image/svg+xml", sizes: "180x180" },
    ],
    shortcut: "/favicon.svg",
  },
  manifest: undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} overflow-x-hidden`} suppressHydrationWarning>
      <head>
        {/* SVG favicon — scales perfectly from 16px to 256px */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* Apple home screen icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.svg" />
        {/* Theme colour matches SafariCharge teal */}
        <meta name="theme-color" content="#01696f" />
        <meta name="msapplication-TileColor" content="#01696f" />
      </head>
      <body className={`${inter.className} overflow-x-hidden`}>
        <ThemeProvider>
          {children}
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
