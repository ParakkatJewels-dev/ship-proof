-- ==============================================================================
-- ShipProof: share links for packing videos
-- Migration 00014: staff can make extra watch links for a video (the "Share" action). Each link works
-- like the customer's link: the secret in the address is the credential and only its SHA-256 hash is
-- stored. A link stops working when its video is deleted (cascade) or expires.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS video_share_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_share_links_video ON video_share_links (video_id);

-- Only the API (service role) reads and writes share links.
ALTER TABLE video_share_links ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON video_share_links FROM anon, authenticated;
GRANT ALL ON video_share_links TO service_role;
