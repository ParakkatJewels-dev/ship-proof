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
