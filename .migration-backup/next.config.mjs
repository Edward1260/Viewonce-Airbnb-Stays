import path from 'path';
import { fileURLToPath } from 'url';

/** @type {import('next').NextConfig} */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  // Ensure Next infers correct workspace root when multiple lockfiles exist
  outputFileTracingRoot: __dirname
};

export default nextConfig;