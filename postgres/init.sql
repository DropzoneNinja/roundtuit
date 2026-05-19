-- PostgreSQL initialization script
-- Runs once on first container startup via docker-entrypoint-initdb.d/
-- The database, user, and password are created automatically from
-- POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB env vars.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
