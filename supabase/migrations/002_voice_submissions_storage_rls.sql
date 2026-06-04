-- Voice Recording & Transcription storage RLS policy
-- Created: 2026-05-15
-- Purpose: Allow unauthenticated direct uploads to voice-submissions bucket

-- Enable RLS on storage.objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow unauthenticated INSERT (upload) to voice-submissions bucket only
CREATE POLICY "Allow unauthenticated upload to voice-submissions"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'voice-submissions'
  AND auth.role() = 'anon'
);

-- Policy 2: Allow service role full access (for cleanup, admin operations)
CREATE POLICY "Service role has full access to voice-submissions"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'voice-submissions')
WITH CHECK (bucket_id = 'voice-submissions');

-- Policy 3: Deny all other operations (read, update, delete for non-service roles)
CREATE POLICY "Deny public read/update/delete on voice-submissions"
ON storage.objects
FOR SELECT, UPDATE, DELETE
TO public
USING (false);

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-submissions', 'voice-submissions', false)
ON CONFLICT (id) DO NOTHING;
