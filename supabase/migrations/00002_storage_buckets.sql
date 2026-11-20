-- ==============================================================================
-- ShipProof: Storage Bucket Setup & Policies
-- Migration 00002: Storage Buckets
-- ==============================================================================

-- Create packing-videos storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'packing-videos',
    'packing-videos',
    false, -- Private bucket: access controlled through signed URLs or authenticated packer/admin
    524288000, -- 500MB max video file size
    ARRAY['video/mp4', 'video/webm', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Service role has full access
CREATE POLICY "Service Role Full Access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'packing-videos')
WITH CHECK (bucket_id = 'packing-videos');

-- RLS Policy: Authenticated users can view videos with signed URL
CREATE POLICY "Authenticated Read Access"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'packing-videos');
