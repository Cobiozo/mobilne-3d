-- Update the models bucket to allow larger files (100MB)
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB in bytes
WHERE id = 'models';

-- Verify the update
SELECT id, name, file_size_limit, public 
FROM storage.buckets 
WHERE id = 'models';