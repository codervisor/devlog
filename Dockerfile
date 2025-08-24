# Multi-stage build for the devlog web application
FROM node:20-alpine AS base

# Install necessary system dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Install pnpm globally
RUN npm install -g pnpm

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# Set working directory
WORKDIR /app

# Copy workspace configuration files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# ========================================
# Dependencies stage
# ========================================
FROM base AS deps

# Copy package.json files for proper dependency resolution
COPY packages/core/package.json ./packages/core/
COPY packages/ai/package.json ./packages/ai/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ========================================
# Builder stage
# ========================================
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/ai/node_modules ./packages/ai/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code (excluding MCP package)
COPY packages/core ./packages/core
COPY packages/ai ./packages/ai
COPY apps/web ./apps/web
COPY tsconfig.json ./
COPY vitest.config.base.ts ./

# Build packages in dependency order (core packages needed for web)
RUN pnpm --filter @codervisor/devlog-core build
RUN pnpm --filter @codervisor/devlog-ai build

# Build web app with standalone output for production
ENV NODE_ENV=production
ENV NEXT_BUILD_MODE=standalone
RUN pnpm --filter @codervisor/devlog-web build

# ========================================
# Runtime stage
# ========================================
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the standalone build output and static files
COPY --from=builder /app/apps/web/.next-build/standalone ./
COPY --from=builder /app/apps/web/.next-build/static ./apps/web/.next-build/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Create directories that the application might need and set permissions
RUN mkdir -p /app/apps/web/.devlog /app/.devlog && \
    chown -R nextjs:nodejs /app

# Set correct permissions
USER nextjs

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the Next.js application using the standalone server
CMD ["node", "apps/web/server.js"]
