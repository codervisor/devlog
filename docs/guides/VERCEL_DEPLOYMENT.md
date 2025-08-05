# Vercel Deployment Guide

## 🚀 Deploying @codervisor/devlog-web to Vercel

This guide walks you through deploying the devlog web interface to Vercel with PostgreSQL.

### Prerequisites

- GitHub account (for code hosting)
- Vercel account
- This monorepo deployed to GitHub

### Step 1: Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Import Project"
3. Connect your GitHub account and select this repository
4. **Important**: Set the **Root Directory** to `/` (repository root, not `packages/web`)

### Step 2: Configure Build Settings

Vercel should automatically detect the `vercel.json` configuration, but verify:

- **Framework**: Next.js
- **Root Directory**: `/` (repository root)
- **Build Command**: `pnpm run build:vercel`
- **Install Command**: `pnpm install --frozen-lockfile`
- **Output Directory**: `packages/web/.next-build`

### Step 3: Add PostgreSQL Database

1. In Vercel dashboard → **Storage** tab
2. Click **Create Database** → **Postgres**
3. Choose database name (e.g., `devlog-prod`)
4. Vercel automatically adds these environment variables:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL` 
   - `POSTGRES_URL_NON_POOLING`

### Step 4: Deploy

Click **Deploy**! 

Vercel will:
1. Install dependencies with pnpm
2. Build @codervisor/devlog-core package (with auto-detection from `POSTGRES_URL`)
3. Build @codervisor/devlog-web package  
4. Deploy the web app

### Step 5: Verify Deployment

1. Visit your deployed URL
2. The app should automatically:
   - Detect PostgreSQL from `POSTGRES_URL` environment variable
   - Connect to PostgreSQL 
   - Initialize database tables
   - Be ready to create/manage devlogs

## 🔧 Local Development with Vercel Postgres

To test locally with the production database:

```bash
# Install Vercel CLI
npm i -g vercel

# Pull environment variables
vercel env pull .env.local

# Run locally (auto-detects PostgreSQL from .env.local)
pnpm dev:web
```

## 🌍 Environment Variable Auto-Detection

The devlog system automatically detects your database from environment variables:

- **`POSTGRES_URL`** → PostgreSQL
- **`MYSQL_URL`** → MySQL  
- **`SQLITE_URL`** → SQLite
- **None** → JSON file storage (default)

No configuration files needed! 🎉

## 🐛 Troubleshooting

### Build Fails: "Cannot resolve @codervisor/devlog-core"
- Ensure `vercel.json` is in repository root
- Check that build command includes `pnpm build:core`

### Database Connection Errors
- Verify `POSTGRES_URL` environment variable exists in Vercel dashboard
- Check that environment variable is properly formatted
- For local testing, ensure `.env.local` contains the database URL

### SSL Certificate Errors (self-signed certificate in certificate chain)
If you encounter SSL certificate errors in Vercel deployment:
- This is automatically handled by the updated SSL configuration
- The system defaults to SSL with self-signed certificate support in production
- If needed, you can override by setting `POSTGRES_SSL="false"` in Vercel environment variables
- For custom SSL configuration, set `POSTGRES_SSL='{"rejectUnauthorized":false,"ca":"..."}'`

### SASL Authentication Errors (SCRAM-SERVER-FINAL-MESSAGE: server signature is missing)
If you encounter SASL authentication errors:
- This is automatically handled by using `POSTGRES_URL_NON_POOLING` when available
- The system prefers direct connections over pooled connections to avoid authentication issues
- Vercel automatically provides `POSTGRES_URL_NON_POOLING` which bypasses PgBouncer connection pooling
- No manual configuration needed - the fix is automatic

### Auto-Detection Not Working
- Check console logs for database detection messages
- Ensure environment variable names match exactly: `POSTGRES_URL`, `MYSQL_URL`, `SQLITE_URL`
- Verify no syntax errors in environment variable values

### Monorepo Dependencies
- This setup deploys the entire monorepo to handle workspace dependencies

## 📁 File Structure

```
devlog/                    # Repository root
├── vercel.json           # Vercel deployment config
├── .env.example          # Environment variables template
└── packages/
    ├── core/            # @codervisor/devlog-core (auto-detects DB from env vars)
    └── web/             # @codervisor/devlog-web package (deployed)
```

**Key insight**: No configuration files needed! The system auto-detects your database from environment variables. 🚀
