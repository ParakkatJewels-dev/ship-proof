-- ==============================================================================
-- ShipProof: Remove direct read access to stored videos
-- Migration 00007
--
-- Migration 00002 let any signed-in Supabase user read every file in the packing-videos bucket. Supabase
-- allows new sign-ups by default, so a stranger could have created an account and read the videos with
-- the public key. ShipProof never reads storage as a signed-in user: the API uses its service key and hands
-- out short-lived signed links. Removing the policy leaves the service role as the only reader.
-- ==============================================================================

DROP POLICY IF EXISTS "Authenticated Read Access" ON storage.objects;
