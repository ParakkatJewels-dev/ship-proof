-- ==============================================================================
-- ShipProof: Camera device presence
-- Migration 00013: the camera agent reports its status over HTTP every few seconds (no long-lived
-- WebSocket, so the API can run on serverless hosting). The latest report per station is kept here.
-- A station counts as connected while its last report is recent.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS station_presence (
    station_id TEXT PRIMARY KEY,
    -- The agent's full status report: camera, recording, review, upload queue.
    report JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- When this connection began (reset when the station comes back after being silent).
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_station_presence_last_seen ON station_presence (last_seen DESC);

-- Only the API (service role) reads and writes presence; no policies for anyone else.
ALTER TABLE station_presence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON station_presence FROM anon, authenticated;
GRANT ALL ON station_presence TO service_role;
