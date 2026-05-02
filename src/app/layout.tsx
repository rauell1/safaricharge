import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <meta name="theme-color" content="#01696f" />
        <meta name="msapplication-TileColor" content="#01696f" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AIAssistantProvider>
            {children}
          </AIAssistantProvider>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>

        {/*
          #modal-root — the single mount point for ALL Radix portals.

          WHY this exists:
            Radix Dialog/Sheet/Tooltip portals default to document.body,
            but under Next.js App Router SSR hydration the portal can
            attach to the nearest hydrated root instead of true <body>.
            That lands the portal inside the SidebarProvider/SidebarInset
            layout tree, which has overflow/transition properties that
            create a CSS containing block — causing `position:fixed`
            dialogs to measure 50vw against the sidebar box instead of
            the viewport, collapsing them to a vertical strip.

          WHY it's OUTSIDE ThemeProvider/AIAssistantProvider:
            Being a direct child of <body> and the LAST sibling means:
            1. Its containing block is always the true viewport.
            2. It paints on top of every layout layer naturally.
            3. No transform / overflow / will-change ancestor can
               interfere with its fixed-position children.

          The `useModalRoot` hook (src/hooks/useModalRoot.ts) resolves
          this element after hydration and passes it as `container` to
          every DialogPortal / SheetPortal in the app.
        */}
        <div id="modal-root" />
      </body>
    </html>
  );
}
