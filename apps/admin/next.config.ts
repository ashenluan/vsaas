/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vsaas/shared-types'],
  output: 'standalone',
};

export default nextConfig;
