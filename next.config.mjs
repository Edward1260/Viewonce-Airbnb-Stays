/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ];
  },
  // Vercel deployment
  output: 'standalone',
  trailingSlash: true,
};

export default nextConfig;
