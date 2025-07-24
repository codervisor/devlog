# Docker Setup for Devlog

This directory contains Docker configuration for the Devlog application.

## Quick Start

### Production Setup

Start the application with PostgreSQL:

```bash
# Start the full stack
docker-compose up -d

# View logs
docker-compose logs -f web

# Stop the stack
docker-compose down
```

The web application will be available at `http://localhost:3000`.

### Development Setup

For development with hot reloading:

```bash
# Start development environment
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up web-dev

# Or just the database for local development
docker-compose up postgres
```

### Using SQLite (Local Development)

For simple local development without PostgreSQL:

```bash
# Start with SQLite profile
docker-compose -f docker-compose.dev.yml --profile sqlite-dev up
```

## Services

### Web Application

- **Port**: 3000
- **Environment**: Production-ready Next.js application
- **Database**: PostgreSQL or SQLite
- **Health Check**: Available at `/api/health`

### PostgreSQL Database

- **Port**: 5432
- **Database**: `devlog`
- **Username**: `postgres`
- **Password**: `postgres`
- **Data**: Persisted in Docker volume `postgres_data`

### Redis (Optional)

- **Port**: 6379
- **Profile**: `with-cache`
- **Usage**: Start with `--profile with-cache`

## Configuration

### Environment Variables

Key environment variables for the web application:

```bash
# Database Configuration
POSTGRES_URL=postgresql://postgres:postgres@postgres:5432/devlog
DEVLOG_STORAGE_TYPE=postgres
POSTGRES_SSL=false

# Application Settings
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
```

### Docker Images

The application uses multi-stage builds for optimization:

1. **Dependencies Stage**: Installs npm packages
2. **Builder Stage**: Compiles TypeScript and builds Next.js
3. **Runner Stage**: Minimal production runtime

## GitHub Container Registry

Images are automatically built and pushed to GHCR on:

- Push to `main` or `develop` branches
- Git tags starting with `v*`

### Pull and Run

```bash
# Pull the latest image
docker pull ghcr.io/codervisor/devlog:latest

# Run with environment variables
docker run -p 3000:3000 \
  -e DEVLOG_STORAGE_TYPE=json \
  ghcr.io/codervisor/devlog:latest
```

## Profiles

Docker Compose supports different profiles for different use cases:

- **Default**: Web application + PostgreSQL
- **`with-cache`**: Include Redis caching
- **`sqlite-dev`**: Use SQLite for local development

```bash
# Start with caching
docker-compose --profile with-cache up

# Development with SQLite
docker-compose -f docker-compose.dev.yml --profile sqlite-dev up
```

## Health Checks

The web application includes health checks:

- **Docker**: Built-in health check calls `/api/health`
- **Compose**: Service dependencies ensure proper startup order

## Data Persistence

- **PostgreSQL Data**: Stored in `postgres_data` Docker volume
- **Redis Data**: Stored in `redis_data` Docker volume
- **SQLite Data**: Mounted to `./data` directory

## Troubleshooting

### Check Application Logs

```bash
docker-compose logs web
```

### Check Database Connection

```bash
docker-compose exec postgres psql -U postgres -d devlog -c '\l'
```

### Reset Database

```bash
docker-compose down -v  # Removes volumes
docker-compose up -d
```

### Development Debug

```bash
# Run in development mode with volume mounts
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up web-dev

# Access container shell
docker-compose exec web-dev sh
```
