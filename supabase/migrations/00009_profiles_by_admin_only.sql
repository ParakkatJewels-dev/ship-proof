-- ==============================================================================
-- ShipProof: Only administrators add people to ShipProof
-- Migration 00009
--
-- Migration 00005 created a PACKER profile for every new Supabase account. Combined with public sign-up,
-- that would have let a stranger sign in to the dashboard. The API now only accepts accounts that already
-- have a profile, and this removes the automatic profile, so a profile exists only when an admin adds it
-- (npm run user:create in apps/api).
-- Accounts that already have a profile are not touched.
-- ==============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
