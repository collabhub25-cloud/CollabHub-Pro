import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output mode for containerized deployment
  output: "standalone",

  // Enable React strict mode in production
  reactStrictMode: true,

  // TypeScript configuration
  typescript: {
    // Don't ignore build errors in production
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // Security headers
  async headers() {
    const ContentSecurityPolicy = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://checkout.razorpay.com https://cdn.razorpay.com https://*.razorpay.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.cloudfront.net https://*.razorpay.com;
      font-src 'self' data: https://fonts.gstatic.com;
      connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com https://generativelanguage.googleapis.com https://*.razorpay.com https://lumberjack.razorpay.com;
      frame-src 'self' https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com;
      frame-ancestors 'none';
      base-uri 'self';
      form-action 'self';
      object-src 'none';
    `;

    const securityHeaders = [
      {
        key: 'Content-Security-Policy',
        value: ContentSecurityPolicy.replace(/\n/g, ''),
      },
      {
        key: 'X-DNS-Prefetch-Control',
        value: 'on'
      },
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload'
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block'
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY'
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff'
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin'
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()'
      },
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        ],
      },
      // CDN caching for static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Image optimization cache
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },

  // Redirects for security
  async redirects() {
    return [
      // Redirect www to non-www
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.collabhub.app' }],
        destination: 'https://collabhub.app/:path',
        permanent: true,
      },
    ];
  },

  // Rewrites for API versioning (future)
  async rewrites() {
    return [];
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Experimental features
  experimental: {
    // Tree-shake heavy barrel imports to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      'date-fns',
      'framer-motion',
      'motion',
      'chart.js',
      'react-chartjs-2',
      'react-markdown',
      'react-syntax-highlighter',
      '@tanstack/react-table',
      '@tanstack/react-query',
    ],
  },

  // Heavy server-only packages excluded from client bundles
  serverExternalPackages: [
    'mongoose',
    'jsonwebtoken',
    'bcryptjs',
    'nodemailer',
    'sharp',
  ],

  // Environment variables exposed to browser
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },

  // Logging
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === 'development',
    },
  },

  // Production source maps (disable for performance)
  productionBrowserSourceMaps: false,

  // Powered-by header (security)
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Generate ETags
  generateEtags: true,
};

export default nextConfig;
