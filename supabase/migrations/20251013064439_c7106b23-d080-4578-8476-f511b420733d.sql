-- Create table for available materials
CREATE TABLE public.available_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_name TEXT NOT NULL UNIQUE,
  material_key TEXT NOT NULL UNIQUE,
  multiplier NUMERIC NOT NULL DEFAULT 1.0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.available_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active materials"
ON public.available_materials
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage materials"
ON public.available_materials
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Insert default materials
INSERT INTO public.available_materials (material_name, material_key, multiplier, sort_order) VALUES
  ('PLA', 'pla', 1.0, 1),
  ('ABS', 'abs', 1.2, 2),
  ('PETG', 'petg', 1.3, 3),
  ('TPU', 'tpu', 1.5, 4),
  ('Nylon', 'nylon', 1.8, 5);

-- Create trigger for updated_at
CREATE TRIGGER update_available_materials_updated_at
  BEFORE UPDATE ON public.available_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();