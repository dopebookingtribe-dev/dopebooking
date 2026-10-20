import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content-Security-Policy without nonces: nonces would force every page to
// render per request and lose the static shell. 'unsafe-inline' scripts are
// needed by Next.js in that mode; the other directives still block plugins,
// framing, foreign form targets and unknown hosts.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://*.supabase.co https://i.ytimg.com https://image.mux.com https://*.cloudflarestream.com",
  "font-src 'self'",
  // Browser uploads go straight to Supabase Storage.
  "connect-src 'self' https://*.supabase.co",
  // Video players load only after the visitor presses play.
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://player.mux.com https://*.cloudflarestream.com",
  "media-src 'self' https://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  // Server actions redirect to Stripe for checkout and payout onboarding.
  "form-action 'self' https://checkout.stripe.com https://connect.stripe.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  images: {
    // Public Supabase Storage objects and video provider thumbnails only.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "image.mux.com" },
      {
        protocol: "https",
        hostname: "*.cloudflarestream.com",
        pathname: "/*/thumbnails/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
