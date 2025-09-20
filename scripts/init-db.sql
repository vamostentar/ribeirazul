-- ====================================
-- Initialize Consolidated Database
-- ====================================
-- This script creates multiple schemas in a single database
-- for better resource utilization and easier management

-- Create schemas if they don't exist
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS properties;
CREATE SCHEMA IF NOT EXISTS settings;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS media;

-- Grant privileges to the default user
GRANT ALL PRIVILEGES ON SCHEMA auth TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA properties TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA settings TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA users TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA media TO postgres;

-- Set search path to include all schemas
ALTER DATABASE ribeirazul SET search_path TO public, auth, properties, settings, users, media;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- Create shared types that can be used across schemas
DO $$ 
BEGIN
    -- Common enum types
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'AGENT', 'USER', 'SUPER_ADMIN');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'property_status') THEN
        CREATE TYPE property_status AS ENUM ('for_sale', 'for_rent', 'sold', 'rented', 'under_contract', 'withdrawn');
    END IF;
END$$;

-- Add comments for documentation
COMMENT ON SCHEMA auth IS 'Authentication and authorization data';
COMMENT ON SCHEMA properties IS 'Real estate properties and related data';
COMMENT ON SCHEMA settings IS 'Application settings and configurations';
COMMENT ON SCHEMA users IS 'User profiles and preferences';
COMMENT ON SCHEMA media IS 'Media files metadata and references';

-- Create indexes for better performance (examples)
-- These will be created after Prisma migrations run

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully';
    RAISE NOTICE 'Schemas created: auth, properties, settings, users, media';
END $$;
