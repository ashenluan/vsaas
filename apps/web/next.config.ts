/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@vsaas/shared-types'],
  // output: 'standalone', // Enable for Docker production builds
};

export default nextConfig;
