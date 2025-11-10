// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ultrawaveinteractive.com',
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*", // proxy backend
      },
    ];
  },
};