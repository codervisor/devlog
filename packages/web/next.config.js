/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@devlog/core'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
  webpack: (config, { isServer }) => {
    // Handle the workspace packages properly
    if (isServer) {
      // Ensure these packages are treated as externals for server-side
      config.externals = config.externals || [];
      // Allow these packages to be bundled and transpiled instead of externalized
    }
    
    return config;
  },
};

module.exports = nextConfig;
