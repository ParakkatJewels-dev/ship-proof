-- ==============================================================================
-- ShipProof: remember the picture size and frame rate of each saved video
-- Migration 00012
--
-- Measured by the camera computer on the file it uploads (after compression), so they describe the stored video.
-- Videos saved before this change have no values.
-- ==============================================================================

ALTER TABLE videos ADD COLUMN IF NOT EXISTS width INT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS height INT;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS fps NUMERIC(6, 2);

COMMENT ON COLUMN videos.width IS 'Picture width of the stored video, in pixels.';
COMMENT ON COLUMN videos.height IS 'Picture height of the stored video, in pixels.';
COMMENT ON COLUMN videos.fps IS 'Frames per second of the stored video.';
