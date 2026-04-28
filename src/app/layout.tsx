import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { AIFloatingButton } from "@/components/ai/AIFloatingButton";
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
    // overflow-x-hidden removed from <html> and <body>.
    // Radix/shadcn dialogs use fixed portals measured against the viewport;
    // overflow-x:hidden on <html>/<body> makes those elements the containing
    // block for fixed children, which mis-centres dialogs and clips overlays.
    // The overflow guard now lives on .page-shell in globals.css instead.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* SVG favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {/* Theme colour matches SafariCharge teal */}
        <meta name="theme-color" content="#01696f" />
        <meta name="msapplication-TileColor" content="#01696f" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          {/*
            AIAssistantProvider wraps the ENTIRE app so the AI panel
            state is never reset on page navigation.
            AIFloatingButton is rendered here — outside the page router —
            so it persists on every page including landing, auth, demo, etc.
            DashboardLayout renders the actual SafariChargeAIAssistant panel;
            the FAB here just controls the isOpen flag via context.
          */}
          <AIAssistantProvider>
            {children}
            <AIFloatingButton />
          </AIAssistantProvider>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
