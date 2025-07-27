-- Minimal PostgreSQL initialization for devlog application
-- Only includes essential extensions and permissions
-- Tables are created automatically by TypeORM based on entity definitions

-- Enable useful PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Note: Table schema is created automatically by TypeORM synchronization
-- No manual table creation needed
