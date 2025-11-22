import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable Turbopack (faster than Webpack)
  reactStrictMode: true,

  // Experimental features
  experimental: {
    // Turbopack is enabled via CLI flag
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
