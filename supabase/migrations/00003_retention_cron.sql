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
