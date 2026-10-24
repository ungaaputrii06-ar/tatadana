const fs = require('fs');
const path = require('path');

// Clean up redundant (auth) directory to prevent Next.js App Router route collisions
const authGroupDir = path.join(__dirname, 'src', 'app', '(auth)');
if (fs.existsSync(authGroupDir)) {
  try {
    fs.rmSync(authGroupDir, { recursive: true, force: true });
  } catch (e) {
    console.warn('Could not clean up (auth) folder:', e);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    webpackBuildWorker: false,
    instrumentationHook: true,
    serverComponentsExternalPackages: ['jspdf', 'xlsx'],
    optimizePackageImports: ['lucide-react', 'clsx', 'tailwind-merge'],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    return [
      ...(isProd
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
                { key: 'Vary', value: 'Accept-Encoding' },
              ],
            },
          ]
        : []),
      {
        source: '/api/:path*',
        headers: [
          { key: 'X-Turbo-Boost', value: 'active-turbo-accelerated' },
          { key: 'X-Acceleration-Level', value: 'extreme-level-2' },
          { key: 'X-Cache-Warmup', value: 'ready' },
          { key: 'Vary', value: 'Accept-Encoding' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
  webpack: (config) => {
    return config;
  },
};

module.exports = nextConfig;
