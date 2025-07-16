/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  transpilePackages: ['@devlog/core'],
  experimental: {
    serverComponentsExternalPackages: [],
  },
  webpack: (config, { isServer }) => {
    // Handle the workspace packages properly
    if (isServer) {
      // Ensure these packages are treated as externals for server-side
      config.externals = config.externals || [];
    }

    // Fix Monaco Editor issues for client-side
    if (!isServer) {
      // Additional fallbacks for browser compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
        process: false,
      };

      // Ensure proper handling of dynamic imports
      config.output.globalObject = 'globalThis';
    }

    return config;
  },
};

module.exports = nextConfig;
