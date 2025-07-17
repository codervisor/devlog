# Configuration Migration Guide: devlog.config.json → .env

This guide covers the migration from `devlog.config.json` files to environment variable-based configuration.

## 🎯 Overview

The devlog system now uses environment variables instead of `devlog.config.json` files for configuration. This provides:

- **Better security**: Secrets don't get committed to git
- **Easier deployment**: Standard for cloud platforms (Vercel, Railway, etc.)
- **Environment flexibility**: Easy switching between dev/staging/production
- **12-factor app compliance**: Industry standard configuration approach

## 📋 Migration Steps

### 1. Remove devlog.config.json files
The configuration system no longer reads `devlog.config.json` files. You can safely delete them:

```bash
rm devlog.config.json
```

### 2. Set up environment variables

Copy the provided `.env.example` to create your environment configuration:

```bash
cp .env.example .env.local  # For local development
```

### 3. Configure your storage backend

Choose one of the following storage options:

#### PostgreSQL (Recommended for Production)
```bash
POSTGRES_URL="postgresql://username:password@host:5432/database"
# OR
DATABASE_URL="postgresql://username:password@host:5432/database"
```

#### MySQL
```bash
MYSQL_URL="mysql://username:password@host:3306/database"
```

#### SQLite (Local Development)
```bash
SQLITE_URL="./devlog.db"
```

#### GitHub Issues Storage
```bash
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
GITHUB_OWNER="username-or-org"
GITHUB_REPO="repository-name"
```

#### JSON File Storage (Default)
If no database URL is provided, the system defaults to JSON file storage:

```bash
# Optional JSON storage customization
DEVLOG_JSON_DIRECTORY=".devlog"
DEVLOG_JSON_FILE_PATTERN="{id:auto}-{slug}.json"
DEVLOG_JSON_MIN_PADDING="3"
DEVLOG_JSON_GLOBAL="true"
```

## 🔄 Configuration Mapping

### Old devlog.config.json Format
```json
{
  "storage": {
    "type": "postgres",
    "connectionString": "${POSTGRES_URL}",
    "options": {
      "ssl": false
    }
  }
}
```

### New Environment Variables
```bash
POSTGRES_URL="postgresql://username:password@host:5432/database"
```

### JSON Storage Migration
```json
// OLD: devlog.config.json
{
  "storage": {
    "type": "json",
    "json": {
      "directory": "custom-devlog",
      "filePattern": "{id:auto}-{slug}.json",
      "minPadding": 5,
      "global": false
    }
  }
}
```

```bash
# NEW: .env
DEVLOG_JSON_DIRECTORY="custom-devlog"
DEVLOG_JSON_FILE_PATTERN="{id:auto}-{slug}.json"
DEVLOG_JSON_MIN_PADDING="5"
DEVLOG_JSON_GLOBAL="false"
```

### GitHub Storage Migration
```json
// OLD: devlog.config.json
{
  "storage": {
    "type": "github",
    "github": {
      "owner": "myorg",
      "repo": "my-project",
      "token": "${GITHUB_TOKEN}",
      "labelsPrefix": "work",
      "mapping": {
        "useNativeType": false
      }
    }
  }
}
```

```bash
# NEW: .env
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxx"
GITHUB_OWNER="myorg"
GITHUB_REPO="my-project"
GITHUB_LABELS_PREFIX="work"
GITHUB_USE_NATIVE_TYPE="false"
```

## 🌍 Environment-Specific Configuration

### Local Development (.env.local)
```bash
NODE_ENV="development"
SQLITE_URL="./devlog.db"
DEVLOG_JSON_GLOBAL="false"
```

### Production (.env or Platform Environment Variables)
```bash
NODE_ENV="production"
POSTGRES_URL="postgresql://prod-db-url"
```

### Vercel Deployment
Vercel automatically provides PostgreSQL environment variables:
```bash
POSTGRES_URL="postgres://default:password@host.postgres.vercel-storage.com:5432/verceldb"
```

## 🔧 Auto-Detection Logic

The system automatically detects storage type based on available environment variables:

1. **PostgreSQL**: If `POSTGRES_URL` or `DATABASE_URL` is set
2. **MySQL**: If `MYSQL_URL` is set  
3. **SQLite**: If `SQLITE_URL` is set
4. **GitHub**: If `GITHUB_TOKEN`, `GITHUB_OWNER`, and `GITHUB_REPO` are set
5. **JSON**: Default fallback if no database URLs are detected

## 📚 Complete Environment Variable Reference

See [.env.example](./.env.example) for the complete list of available environment variables and their descriptions.

## ✅ Testing the Migration

Use the provided test script to verify your configuration:

```bash
node test-config-migration.mjs
```

This will test all storage types and configuration options to ensure everything works correctly.

## 🚨 Breaking Changes

- **devlog.config.json files are no longer read**: The system now only uses environment variables
- **Environment variable expansion removed**: No more `${VAR_NAME}` syntax in config files
- **Backward compatibility**: The old ConfigurationManager.saveConfig() method now throws an error

## 🔍 Troubleshooting

### Configuration Not Loading
1. Check that environment variables are set correctly
2. Verify `.env.local` file exists and is properly formatted
3. Ensure environment variables don't have extra spaces or quotes

### Database Connection Issues
1. Verify connection string format is correct
2. Check that database is accessible from your environment
3. Ensure credentials are valid

### JSON Storage Issues
1. Check directory permissions for `DEVLOG_JSON_DIRECTORY`
2. Verify file pattern is valid
3. Ensure workspace detection works correctly
