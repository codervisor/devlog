/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  transpilePackages: ['@codervisor/devlog-core'],
  // Use separate build directory for standalone builds only
  distDir: process.env.NEXT_BUILD_MODE === 'standalone' ? '.next-build' : '.next',
  // Enable standalone output for Docker
  output: process.env.NEXT_BUILD_MODE === 'standalone' ? 'standalone' : undefined,
  experimental: {
    // Minimal serverComponentsExternalPackages after Prisma migration
    // Only authentication dependencies need to be server-side only
    serverComponentsExternalPackages: ['bcrypt', 'jsonwebtoken'],
  },
  webpack: (config, { isServer }) => {
    // Much simpler webpack configuration after Prisma migration
    if (!isServer) {
      // Fix Monaco Editor issues for client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
        process: false,
      };

      // Only exclude authentication modules from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        bcrypt: false,
        jsonwebtoken: false,
        '@mapbox/node-pre-gyp': false,
        'node-pre-gyp': false,
        'mock-aws-s3': false,
        'aws-sdk': false,
        nock: false,
      };
    }

    // Minimal ignore warnings after Prisma migration
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      // Authentication related warnings only
      /Module not found: Can't resolve 'mock-aws-s3'/,
      /Module not found: Can't resolve 'aws-sdk'/,
      /Module not found: Can't resolve 'nock'/,
    ];

    // Handle the workspace packages properly
    if (isServer) {
      // Minimal externals after Prisma migration
      config.externals = config.externals || [];
      config.externals.push(
        'bcrypt',
        'jsonwebtoken',
        '@mapbox/node-pre-gyp',
        'node-pre-gyp',
        'mock-aws-s3',
        'aws-sdk',
        'nock',
      );
    }

    return config;
  },
};

module.exports = nextConfig;
