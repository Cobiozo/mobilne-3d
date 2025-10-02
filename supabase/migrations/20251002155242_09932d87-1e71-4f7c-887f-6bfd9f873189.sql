-- Make models bucket public so non-authenticated users can view public models
UPDATE storage.buckets 
SET public = true 
WHERE name = 'models';