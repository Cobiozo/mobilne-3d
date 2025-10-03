-- Add parcel locker information to orders table
ALTER TABLE public.orders 
ADD COLUMN parcel_locker_code TEXT,
ADD COLUMN parcel_locker_name TEXT,
ADD COLUMN parcel_locker_address TEXT;

-- Create table for saved parcel lockers
CREATE TABLE public.saved_parcel_lockers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  locker_code TEXT NOT NULL,
  locker_name TEXT NOT NULL,
  locker_address TEXT NOT NULL,
  locker_city TEXT,
  locker_postal_code TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_parcel_lockers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved lockers"
ON public.saved_parcel_lockers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved lockers"
ON public.saved_parcel_lockers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved lockers"
ON public.saved_parcel_lockers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved lockers"
ON public.saved_parcel_lockers
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all saved lockers"
ON public.saved_parcel_lockers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_saved_parcel_lockers_updated_at
BEFORE UPDATE ON public.saved_parcel_lockers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_saved_parcel_lockers_user_id ON public.saved_parcel_lockers(user_id);
CREATE INDEX idx_saved_parcel_lockers_favorite ON public.saved_parcel_lockers(user_id, is_favorite) WHERE is_favorite = true;