-- PostgreSQL Security Setup Script
-- This script creates a secure database setup with proper user permissions
-- Run this script as a PostgreSQL superuser (postgres)

-- ============================================
-- STEP 1: Create application database (if not exists)
-- ============================================
-- CREATE DATABASE airbnb_db; -- Uncomment if creating new database

-- ============================================
-- STEP 2: Create application user with limited permissions
-- ============================================

-- Drop existing user if exists (careful in production!)
-- DROP USER IF EXISTS airbnb_app;

CREATE USER airbnb_app WITH PASSWORD 'your_secure_password_here';

-- ============================================
-- STEP 3: Grant basic permissions
-- ============================================

-- Connect to the database
-- \c airbnb_db

-- Grant connect permission
GRANT CONNECT ON DATABASE airbnb_db TO airbnb_app;

-- Grant usage on public schema
GRANT USAGE ON SCHEMA public TO airbnb_app;

-- Grant permissions to create and use objects in public schema
GRANT CREATE ON SCHEMA public TO airbnb_app;

-- ============================================
-- STEP 4: Grant table-level permissions
-- ============================================

-- Grant permissions on all existing tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO airbnb_app;

-- Grant permissions on all sequences (for auto-increment)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO airbnb_app;

-- ============================================
-- STEP 5: Set default permissions for future tables
-- ============================================

-- This ensures new tables created by airbnb_app will also be accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO airbnb_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO airbnb_app;

-- ============================================
-- STEP 6: Row Level Security (Optional - for multi-tenant setups)
-- ============================================

-- Enable RLS on sensitive tables (uncomment if needed)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for users table (example)
-- CREATE POLICY users_select_policy ON users
--     FOR SELECT USING (true); -- Adjust as needed

-- CREATE POLICY users_update_policy ON users
--     FOR UPDATE USING (true); -- Adjust as needed

-- ============================================
-- STEP 7: Create read-only role (optional)
-- ============================================

-- CREATE ROLE airbnb_readonly;
-- GRANT CONNECT ON DATABASE airbnb_db TO airbnb_readonly;
-- GRANT USAGE ON SCHEMA public TO airbnb_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO airbnb_readonly;
-- GRANT airbnb_readonly TO airbnb_app;

-- ============================================
-- STEP 8: Revoke public access (security best practice)
-- ============================================

REVOKE CREATE ON SCHEMA public FROM public;
REVOKE ALL PRIVILEGES ON DATABASE airbnb_db FROM public;

-- ============================================
-- NOTES:
-- ============================================
-- 1. Replace 'your_secure_password_here' with a strong password
-- 2. Run this script as postgres user: psql -U postgres -f postgres-security-setup.sql
-- 3. Update .env file with the new credentials:
--    DB_USERNAME=airbnb_app
--    DB_PASSWORD=your_secure_password_here
-- 4. For production, consider using a password manager
-- 5. Review and adjust permissions based on your needs
