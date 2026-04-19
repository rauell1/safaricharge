import { withWorkflow } from "workflow/next";
import type { NextConfig } from "next";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    ".space.z.ai",
    "space.z.ai",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "drive.google.com",
        pathname: "/uc",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/public/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=3600",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' blob:",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://www.transparenttextures.com https://drive.google.com",
              // Supabase auth, realtime, storage + existing analytics endpoints
              `connect-src 'self' ${SUPABASE_URL} https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://vitals.vercel-insights.com https://va.vercel-scripts.com`,
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'self' https://*.supabase.co",
              "worker-src blob:",
            ].join("; "),
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default withWorkflow(nextConfig);
