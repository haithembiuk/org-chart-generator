/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@shared/types', '@ui/components'],
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@shared': require('path').resolve(__dirname, '../../packages/shared'),
      '@ui': require('path').resolve(__dirname, '../../packages/ui'),
      '@config': require('path').resolve(__dirname, '../../packages/config'),
    }
    return config
  },
}

module.exports = nextConfig