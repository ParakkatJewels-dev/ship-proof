-- ==============================================================================
-- ShipProof: let the API (service role) use the tables
-- Migration 00010
--
-- New Supabase projects do not automatically give the API roles access to tables created with SQL.
-- Without this the API gets "permission denied for table ...".
--
-- Only the service role is granted access. The public roles (anon, authenticated) get nothing, so the public
-- Supabase key still cannot read or write any of these tables, on top of the row level security.
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Tables and functions added by later migrations get the same access.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;
