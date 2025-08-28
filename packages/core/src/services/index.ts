// TypeORM-based services (legacy)
export { DevlogService } from './devlog-service.js';
export { ProjectService } from './project-service.js';
export { DocumentService } from './document-service.js';
export { AuthService } from './auth-service.js';

// Prisma-based services (new)
export { PrismaProjectService } from './prisma-project-service.js';
export { PrismaDevlogService } from './prisma-devlog-service.js';
export { PrismaAuthService } from './prisma-auth-service.js';
export { PrismaChatService } from './prisma-chat-service.js';

// Other services
export { LLMService, createLLMServiceFromEnv, getLLMService } from './llm-service.js';
export type { LLMServiceConfig } from './llm-service.js';

// SSO Service
export { SSOService } from './sso-service.js';

// Note: During migration, both TypeORM and Prisma services are available
// Applications can gradually migrate from TypeORM services to Prisma services
