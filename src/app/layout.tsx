import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { AIAssistantProvider } from "@/contexts/AIAssistantContext";
import { ScenarioLoader } from "@/components/ScenarioLoader";
import { PreferencesLoader } from "@/components/PreferencesLoader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://solar.rauell.systems"),
  title: {
    default: "SafariCharge — Solar Energy Management Platform",
    template: "%s | SafariCharge",
  },
  description:
    "Solar PV + BESS simulation, MILP dispatch optimization, and KPLC tariff analysis for Kenya and Africa. Model solar systems, forecast financial returns, and reduce grid bills.",
  keywords: [
    "solar energy Kenya",
    "BESS optimization Kenya",
    "KPLC tariff calculator",
    "solar simulation Africa",
    "battery storage microgrid",
    "off-grid solar Kenya",
    "EV charging optimization",
    "solar PV dashboard",
    "energy management system Africa",
    "microgrid simulation",
    "SafariCharge",
    "MILP solar optimizer",
    "solar ROI Kenya",
    "carbon reduction Africa",
    "Nairobi solar energy",
    "solar battery sizing tool",
    "grid-tied solar Kenya",
    "KPLC peak tariff savings",
    "solar financial analysis",
    "Africa renewable energy platform",
  ],
  authors: [{ name: "Roy Okola", url: "https://solar.rauell.systems" }],
  creator: "Roy Okola",
  publisher: "SafariCharge",
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_KE",
    alternateLocale: ["en_US", "en_GB"],
    url: "https://solar.rauell.systems",
    siteName: "SafariCharge",
    title: "SafariCharge — Solar Energy Management Platform",
    description:
      "Solar PV + BESS simulation, MILP dispatch optimization, and KPLC tariff analysis for Kenya and Africa.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "SafariCharge Solar Energy Dashboard — Kenya and Africa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@rauell1",
    creator: "@rauell1",
    title: "SafariCharge — Solar Energy Management Platform",
    description:
      "Solar PV + BESS simulation, MILP dispatch optimization, and KPLC tariff analysis for Kenya and Africa.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
    shortcut: "/favicon.png",
  },
  alternates: {
    canonical: "https://solar.rauell.systems/landing",
  },
  verification: {
    google: "YopMsxRCWbWYZU_ANAhcwd6ggCeArux5CR37WuXqXXA",
    other: {
      "msvalidate.01": "66CE208CF02793B41D19362E121494C6",
    },
  },
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
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="theme-color" content="#01696f" />
        <meta name="msapplication-TileColor" content="#01696f" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AIAssistantProvider>
            <ScenarioLoader />
            <PreferencesLoader />
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
