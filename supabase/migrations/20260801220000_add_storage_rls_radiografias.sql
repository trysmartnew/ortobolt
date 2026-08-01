-- Migration: RLS policies for bucket 'radiografias'
-- Aligns with case-images bucket policies (path-based ownership).

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- INSERT: user can upload to radiografias bucket with own uid prefix
CREATE POLICY "radiografias_insert_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'radiografias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: user can read own objects
CREATE POLICY "radiografias_select_own"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'radiografias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: user can delete own objects
CREATE POLICY "radiografias_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'radiografias'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
