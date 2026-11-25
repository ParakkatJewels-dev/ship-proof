-- ==============================================================================
-- ShipProof: the database files that followed the first three, in one script.
--
-- STATUS: ALREADY APPLIED on 25 Nov 2026 to the Supabase project "ship-proof"
--         (xemfdtlfpnmoykxhzuua). Do not run it again on that project.
--         Keep it to set up another project: run migrations 00001, 00002 and 00004 first
--         (from supabase/migrations), then paste this whole file into the SQL editor and press Run.
--
-- This script contains: 00003 (retention functions, no nightly schedule), 00005 (user roles),
-- 00006 (video pipeline and row level security), 00007 (storage policy) and 00008
-- (videos are kept 30 days after delivery and 60 days after a return to origin).
-- The final retention rules come from 00008; the numbers live in the retention_policy table.
-- ==============================================================================

-- ##### 00003_retention_cron.sql #####
-- ==============================================================================
-- ShipProof: Automated Video Retention Cleanup
-- Migration 00003: Retention functions (no nightly schedule: the API's hourly job deletes the files)
-- ==============================================================================

-- Function: Triggered when order is marked DELIVERED to calculate expiry date
CREATE OR REPLACE FUNCTION set_video_retention_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- If delivery status changed to DELIVERED and delivered_at is set
    IF NEW.delivery_status = 'DELIVERED' AND (OLD.delivery_status IS DISTINCT FROM 'DELIVERED' OR OLD.delivered_at IS NULL) THEN
        IF NEW.delivered_at IS NULL THEN
            NEW.delivered_at = NOW();
        END IF;

        -- Set video expiry after delivery (replaced by migration 00008, which reads the days from retention_policy)
        UPDATE videos
        SET expires_at = NEW.delivered_at + INTERVAL '30 days',
            updated_at = NOW()
        WHERE order_id = NEW.id
          AND status IN ('PROCESSED', 'ACTIVE');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_delivered_retention ON orders;
CREATE TRIGGER trg_order_delivered_retention
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_video_retention_expiry();

-- Stored Procedure to mark expired videos for deletion
CREATE OR REPLACE FUNCTION purge_expired_videos()
RETURNS TABLE(purged_count INT) AS $$
DECLARE
    affected_rows INT;
BEGIN
    -- Mark active videos as EXPIRED where current timestamp exceeds expires_at
    WITH updated AS (
        UPDATE videos
        SET status = 'EXPIRED',
            updated_at = NOW()
        WHERE status = 'ACTIVE'
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO affected_rows FROM updated;

    -- Log purge run
    INSERT INTO audit_logs (event_type, details)
    VALUES ('RETENTION_PURGE_RUN', jsonb_build_object('expired_videos_flagged', affected_rows, 'timestamp', NOW()));

    RETURN QUERY SELECT affected_rows;
END;
$$ LANGUAGE plpgsql;


-- ##### 00005_profiles.sql #####
-- Who may sign in to the ShipProof dashboard, and what they may do.
-- Accounts themselves live in Supabase Auth (auth.users). This table adds a display name and a role.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'PACKER' check (role in ('ADMIN', 'PACKER')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A signed-in person may read their own profile. The API reads every profile with the service key,
-- which bypasses these rules, and nobody can change a role from the browser.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

-- Every new account gets a PACKER profile. Promote someone with:
--   update public.profiles set role = 'ADMIN' where id = '<user id>';
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ##### 00006_video_pipeline.sql #####
-- ==============================================================================
-- ShipProof: Make the video pipeline work against a real database
-- Migration 00006
--
--  1. videos.session_id: the camera agent creates the session id itself, so there is no packing_sessions
--     row to point at. The foreign key made every video insert fail.
--  2. Customer watch links: each video gets a secret token. Only its hash is stored.
--  3. Packed status that survives reloads: orders.packed_at.
--  4. Retention: expiry is counted from the real delivery date, also for videos that finish uploading
--     after the order was already delivered.
--  5. Row level security on every table, so the public Supabase key cannot read anything.
-- ==============================================================================

-- 1. Session ids come from the camera agent
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_session_id_fkey;
ALTER TABLE videos ALTER COLUMN session_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_session_id ON videos(session_id);

-- 2. Customer watch links
ALTER TABLE videos ADD COLUMN IF NOT EXISTS watch_token_hash TEXT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS shopify_synced_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_videos_watch_token_hash
    ON videos(watch_token_hash) WHERE watch_token_hash IS NOT NULL;

COMMENT ON COLUMN videos.watch_token_hash IS
    'SHA-256 of the secret in the customer watch link. The secret itself is never stored.';
COMMENT ON COLUMN videos.shopify_synced_at IS
    'When the watch link was last written to the Shopify order. Null means it still has to be sent.';

-- 3. Packed status
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;

-- 4. Retention
-- Expiry is only ever set from a real delivery date: never from order creation or packing time.
CREATE OR REPLACE FUNCTION set_video_retention_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.delivery_status = 'DELIVERED' AND (OLD.delivery_status IS DISTINCT FROM 'DELIVERED' OR OLD.delivered_at IS NULL) THEN
        IF NEW.delivered_at IS NULL THEN
            NEW.delivered_at = NOW();
        END IF;

        UPDATE videos
        SET expires_at = NEW.delivered_at + (retention_days || ' days')::interval,
            updated_at = NOW()
        WHERE order_id = NEW.id
          AND status IN ('UPLOADING', 'PROCESSED', 'ACTIVE');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- A video that finishes uploading after delivery still gets its expiry date.
CREATE OR REPLACE FUNCTION set_video_expiry_from_order()
RETURNS TRIGGER AS $$
DECLARE
    delivered TIMESTAMPTZ;
BEGIN
    IF NEW.expires_at IS NULL AND NEW.status IN ('PROCESSED', 'ACTIVE') THEN
        SELECT delivered_at INTO delivered FROM orders
         WHERE id = NEW.order_id AND delivery_status = 'DELIVERED';
        IF delivered IS NOT NULL THEN
            NEW.expires_at = delivered + (NEW.retention_days || ' days')::interval;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_video_expiry_from_order ON videos;
CREATE TRIGGER trg_video_expiry_from_order
BEFORE INSERT OR UPDATE ON videos
FOR EACH ROW
EXECUTE FUNCTION set_video_expiry_from_order();

-- 5. Row level security. No policies: only the service role (the API) can read or write.
--    The profiles table keeps its own policy from migration 00005.
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE packing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- ##### 00007_tighten_storage_policy.sql #####
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


-- ##### 00008_retention_30_60.sql #####
-- ==============================================================================
-- ShipProof: Video retention of 30 days after delivery, 60 days after a return to origin (RTO)
-- Migration 00008
--
-- A video is kept for:
--   * 30 days after the order was DELIVERED, counted from the real delivery date, or
--   * 60 days after the order was RETURNED (RTO), counted from the date it was marked returned.
-- It is never counted from the order date or the packing date. A video of an order that is neither
-- delivered nor returned has no expiry date and is kept.
-- If an order is delivered and later returned, the later (longer) date wins.
--
-- The two numbers live in the retention_policy table, so changing them later is one UPDATE:
--   update retention_policy set delivered_days = 45, returned_days = 90;
-- A change applies to orders delivered or returned after it; videos that already have an expiry keep it.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS retention_policy (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),  -- exactly one row
    delivered_days INT NOT NULL DEFAULT 30 CHECK (delivered_days > 0),
    returned_days INT NOT NULL DEFAULT 60 CHECK (returned_days > 0)
);
INSERT INTO retention_policy DEFAULT VALUES ON CONFLICT DO NOTHING;
ALTER TABLE retention_policy ENABLE ROW LEVEL SECURITY;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS returned_at TIMESTAMPTZ;
ALTER TABLE videos ALTER COLUMN retention_days SET DEFAULT 30;

-- When a video of this order must be deleted, or NULL while the order is neither delivered nor returned.
CREATE OR REPLACE FUNCTION order_video_expiry(
    p_status TEXT, p_delivered_at TIMESTAMPTZ, p_returned_at TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
DECLARE
    pol retention_policy%ROWTYPE;
BEGIN
    SELECT * INTO pol FROM retention_policy LIMIT 1;
    IF p_status = 'RETURNED' AND p_returned_at IS NOT NULL THEN
        RETURN p_returned_at + make_interval(days => pol.returned_days);
    ELSIF p_status = 'DELIVERED' AND p_delivered_at IS NOT NULL THEN
        RETURN p_delivered_at + make_interval(days => pol.delivered_days);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- When an order becomes DELIVERED or RETURNED, start the countdown on its videos.
CREATE OR REPLACE FUNCTION set_video_retention_expiry()
RETURNS TRIGGER AS $$
DECLARE
    expiry TIMESTAMPTZ;
BEGIN
    IF NEW.delivery_status = 'DELIVERED' AND OLD.delivery_status IS DISTINCT FROM 'DELIVERED' THEN
        IF NEW.delivered_at IS NULL THEN
            NEW.delivered_at = NOW();
        END IF;
    ELSIF NEW.delivery_status = 'RETURNED' AND OLD.delivery_status IS DISTINCT FROM 'RETURNED' THEN
        IF NEW.returned_at IS NULL THEN
            NEW.returned_at = NOW();
        END IF;
    ELSE
        RETURN NEW;
    END IF;

    expiry := order_video_expiry(NEW.delivery_status, NEW.delivered_at, NEW.returned_at);

    -- A return after a delivery can only lengthen the time, never shorten it.
    UPDATE videos
    SET expires_at = GREATEST(COALESCE(expires_at, expiry), expiry),
        updated_at = NOW()
    WHERE order_id = NEW.id
      AND status IN ('UPLOADING', 'PROCESSED', 'ACTIVE');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- A video that finishes uploading after delivery or return still gets its expiry date.
CREATE OR REPLACE FUNCTION set_video_expiry_from_order()
RETURNS TRIGGER AS $$
DECLARE
    o orders%ROWTYPE;
BEGIN
    IF NEW.expires_at IS NULL AND NEW.status IN ('PROCESSED', 'ACTIVE') THEN
        SELECT * INTO o FROM orders WHERE id = NEW.order_id;
        IF FOUND THEN
            NEW.expires_at = order_video_expiry(o.delivery_status, o.delivered_at, o.returned_at);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
