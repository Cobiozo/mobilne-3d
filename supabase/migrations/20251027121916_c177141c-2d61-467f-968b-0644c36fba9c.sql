-- Create models storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('models', 'models', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own models" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own models" ON storage.objects;
DROP POLICY IF EXISTS "Public models are viewable by everyone" ON storage.objects;

-- Allow authenticated users to upload files to the models bucket
CREATE POLICY "Users can upload their own models"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'models' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  OR bucket_id = 'models' 
  AND (storage.foldername(name))[1] IS NOT NULL
  AND (SELECT setting_value->>'folder' FROM site_settings WHERE setting_key = 'models_storage_folder') IS NOT NULL
  AND name LIKE (SELECT setting_value->>'folder' FROM site_settings WHERE setting_key = 'models_storage_folder') || '/' || auth.uid()::text || '/%'
);

-- Allow users to view their own models
CREATE POLICY "Users can view their own models"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'models' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
);

-- Allow users to update their own models
CREATE POLICY "Users can update their own models"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'models' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
);

-- Allow users to delete their own models
CREATE POLICY "Users can delete their own models"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'models' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR name LIKE '%/' || auth.uid()::text || '/%'
  )
);

-- Allow viewing of public models (where is_public is true in models table)
CREATE POLICY "Public models are viewable by everyone"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'models'
  AND EXISTS (
    SELECT 1 FROM models
    WHERE models.file_url LIKE '%' || storage.objects.name
    AND models.is_public = true
  )
);