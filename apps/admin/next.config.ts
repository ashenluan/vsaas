import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.dirname(fileURLToPath(import.meta.url));
const standalone = process.env.NEXT_STANDALONE === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vsaas/shared-types'],
  output: standalone ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(appDir, '../..'),
};

export default nextConfig;
