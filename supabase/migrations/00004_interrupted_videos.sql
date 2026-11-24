-- ==============================================================================
-- ShipProof: Mark recordings that were cut off (power or network failure)
-- Migration 00004: videos.interrupted
-- ==============================================================================

ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS interrupted BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN videos.interrupted IS
    'True when the recording was cut off (power cut, crash) and only the part saved before the cut was uploaded.';
