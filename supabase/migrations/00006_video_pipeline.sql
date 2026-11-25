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
