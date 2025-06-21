/** @type {import('next').NextConfig} */
// next.config.js
module.exports = {
  images: {
    unoptimized: true
  },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BACKEND_URL:
      process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ultrawaveinteractive.com',
    NEXTAUTH_SECRET:
      process.env.NEXTAUTH_SECRET,
  },
};
