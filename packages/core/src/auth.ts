// Authentication-specific server exports
// These include bcrypt and JWT dependencies that should only be imported on the server

// TypeORM-based auth services (legacy)
export { AuthService } from './services/auth-service.js';
export { SSOService } from './services/sso-service.js';

// Prisma-based auth services (new)
export { PrismaAuthService } from './services/prisma-auth-service.js';

// Migration utilities for gradual TypeORM to Prisma transition
export { ServiceFactory } from './utils/service-migration.js';

// Auth-related entities and types
export * from './entities/user.entity.js';
export * from './types/auth.js';