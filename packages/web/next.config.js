/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  transpilePackages: ['@devlog/core'],
  // Use separate build directory for standalone builds only
  distDir: process.env.NEXT_BUILD_MODE === 'standalone' ? '.next-build' : '.next',
  // Enable standalone output for Docker
  output: process.env.NEXT_BUILD_MODE === 'standalone' ? 'standalone' : undefined,
  experimental: {
    serverComponentsExternalPackages: [
      // Keep TypeORM and database drivers server-side only
      'typeorm',
      'pg',
      'mysql2',
      'better-sqlite3',
      'reflect-metadata',
    ],
  },
  webpack: (config, { isServer }) => {
    // Suppress TypeORM warnings for both client and server builds
    config.ignoreWarnings = [
      /Critical dependency: the request of a dependency is an expression/,
      /Module not found: Can't resolve 'react-native-sqlite-storage'/,
      /Module not found: Can't resolve '@sap\/hana-client/,
      /Module not found: Can't resolve 'mysql'/,
      /Module not found.*typeorm.*react-native/,
      /Module not found.*typeorm.*mysql/,
      /Module not found.*typeorm.*hana/,
    ];

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

      // Exclude TypeORM and database-related modules from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        // Prevent TypeORM from being bundled on client-side
        typeorm: false,
        pg: false,
        mysql2: false,
        mysql: false,
        'better-sqlite3': false,
        'reflect-metadata': false,
        // Exclude problematic TypeORM drivers
        'react-native-sqlite-storage': false,
        '@sap/hana-client': false,
        '@sap/hana-client/extension/Stream': false,
        // Additional TypeORM dependencies that shouldn't be in client bundle
        'app-root-path': false,
        dotenv: false,
      };

      // Add ignore patterns for critical dependency warnings
      config.module = config.module || {};
      config.module.unknownContextCritical = false;
      config.module.exprContextCritical = false;

      // Ensure proper handling of dynamic imports
      config.output.globalObject = 'globalThis';
    }

    return config;
  },
};

module.exports = nextConfig;
