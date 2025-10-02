-- Drop existing policies for model_ratings
DROP POLICY IF EXISTS "Users can create their own ratings" ON public.model_ratings;
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.model_ratings;
DROP POLICY IF EXISTS "Users can delete their own ratings" ON public.model_ratings;

-- Create new policies that prevent owners from rating their own models
CREATE POLICY "Users can create ratings for others' models" 
ON public.model_ratings 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND auth.uid() != (SELECT user_id FROM public.models WHERE id = model_id)
);

CREATE POLICY "Users can update their own ratings" 
ON public.model_ratings 
FOR UPDATE 
USING (
  auth.uid() = user_id
  AND auth.uid() != (SELECT user_id FROM public.models WHERE id = model_id)
);

CREATE POLICY "Users can delete their own ratings" 
ON public.model_ratings 
FOR DELETE 
USING (
  auth.uid() = user_id
  AND auth.uid() != (SELECT user_id FROM public.models WHERE id = model_id)
);