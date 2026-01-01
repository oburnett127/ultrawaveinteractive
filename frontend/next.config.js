/** @type {import('next').NextConfig} */
const nextConfig = {
  // -------------------------------------------------
  // ✅ App Router (Next.js 13+ / 16)
  // -------------------------------------------------
  experimental: {
    appDir: true,
  },

  // -------------------------------------------------
  // ✅ React
  // -------------------------------------------------
  reactStrictMode: true,

  // -------------------------------------------------
  // 🖼️ Images
  // -------------------------------------------------
  images: {
    // You are using Cloudflare in front
    // and not Next Image Optimization
    unoptimized: true,
  },

  // -------------------------------------------------
  // 🌍 Public runtime env
  // -------------------------------------------------
  env: {
    // This is SAFE because it is NEXT_PUBLIC_*
    // and intentionally exposed to the browser
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "https://ultrawaveinteractive.com",
  },

  // -------------------------------------------------
  // 🚫 IMPORTANT: No rewrites, no proxies
  // -------------------------------------------------
  // Frontend and backend are separate services.
  // Rewrites here would cause request loops
  // and break Cloudflare / Northflank routing.
};

module.exports = nextConfig;
