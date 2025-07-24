-- Initialize PostgreSQL database for devlog application
-- This script runs when the PostgreSQL container starts for the first time

-- Create the main devlog database (if not already created by POSTGRES_DB)
-- CREATE DATABASE devlog;

-- Connect to the devlog database
\c devlog;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create a user for the application (optional, uses postgres by default)
-- CREATE USER devlog_user WITH PASSWORD 'devlog_password';
-- GRANT ALL PRIVILEGES ON DATABASE devlog TO devlog_user;

-- Note: The actual table schema will be created by the application
-- when it starts using TypeORM or the storage provider initialization

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
