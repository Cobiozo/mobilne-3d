-- Create storage policies for media uploads in models bucket
-- Allow authenticated users to upload to media folder
CREATE POLICY "Allow authenticated users to upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'models' AND
  (storage.foldername(name))[1] = 'media'
);

-- Allow public read access to media files
CREATE POLICY "Allow public read access to media"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'models' AND
  (storage.foldername(name))[1] = 'media'
);

-- Allow authenticated users to update their media
CREATE POLICY "Allow authenticated users to update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'models' AND
  (storage.foldername(name))[1] = 'media'
);

-- Allow authenticated users to delete media
CREATE POLICY "Allow authenticated users to delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'models' AND
  (storage.foldername(name))[1] = 'media'
);