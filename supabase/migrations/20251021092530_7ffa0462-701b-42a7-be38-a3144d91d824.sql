-- Add columns to support multi-model 3MF files
ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS model_index INTEGER,
ADD COLUMN IF NOT EXISTS parent_file TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN public.models.model_index IS 'Index of the model within a multi-model 3MF file (0-based)';
COMMENT ON COLUMN public.models.parent_file IS 'Name of the original file containing multiple models';