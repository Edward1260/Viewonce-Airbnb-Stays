/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    esmExternals: 'loose',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // PWA support
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*', // Proxy to backend if needed
      },
    ];
  },
  // Vercel deployment
  output: 'standalone',
  trailingSlash: true,
};

export default nextConfig;
