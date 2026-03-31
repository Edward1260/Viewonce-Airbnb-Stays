/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  },
  output: 'standalone',
  trailingSlash: true,
  experimental: {
    typedRoutes: true
  }
};

export default nextConfig;
