-- Add thumbnail field to order_items table to store model previews
ALTER TABLE public.order_items 
ADD COLUMN thumbnail TEXT;

COMMENT ON COLUMN public.order_items.thumbnail IS 'Base64 encoded thumbnail image of the 3D model in selected color';