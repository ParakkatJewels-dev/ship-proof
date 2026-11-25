-- ==============================================================================
-- ShipProof: remember when a video was recorded
-- Migration 00011
--
-- created_at is when the upload started, which can be minutes after the recording (the camera computer
-- compresses the video first, or waits for the internet). recorded_at is when the packer started recording.
-- Videos saved before this change have no value; the dashboard then shows the upload time.
-- ==============================================================================

ALTER TABLE videos ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

COMMENT ON COLUMN videos.recorded_at IS
    'When the packer started recording, as reported by the camera computer.';
