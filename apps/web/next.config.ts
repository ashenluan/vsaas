import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vsaas/shared-types'],
  output: 'standalone', // Enable for Docker production builds
  outputFileTracingRoot: path.join(appDir, '../..'),
};

export default nextConfig;
