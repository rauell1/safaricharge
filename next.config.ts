import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Enable gzip/brotli compression to reduce bandwidth under heavy traffic.
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
  async headers() {
    return [
      {
        // Immutable cache for hashed static assets – browsers never re-fetch
        // these under high traffic, dramatically reducing origin requests.
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache public static files (images, icons, robots.txt, etc.).
        source: "/public/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=3600",
          },
        ],
      },
      {
        // Security headers for all routes.
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
              "img-src 'self' data: blob: https://www.transparenttextures.com",
              "connect-src 'self' https://generativelanguage.googleapis.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
              "font-src 'self' https://fonts.gstatic.com",
              "worker-src blob:",
            ].join("; "),
          },
        ],
      },
      {
        // API routes must not be cached by shared proxies; each response is
        // user-specific or dynamically generated.
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          {
            key: "Access-Control-Allow-Origin",
            value: (process.env.API_ALLOWED_ORIGINS ?? "").includes("*")
              ? "*"
              : "same-origin",
          },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-SC-Role, X-SC-Signature",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
