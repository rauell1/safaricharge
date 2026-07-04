import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-V780X8D47E';

// Google tag (gtag.js) — https://analytics.google.com
// Loaded via next/script (afterInteractive) rather than raw <script> tags so
// Next.js can defer/dedupe it correctly instead of blocking hydration.
export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
