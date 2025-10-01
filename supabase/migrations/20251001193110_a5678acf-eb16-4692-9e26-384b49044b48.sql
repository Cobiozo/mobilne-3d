-- Create table for managing available colors
CREATE TABLE public.available_colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  color_hex TEXT NOT NULL UNIQUE,
  color_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.available_colors ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Everyone can view active colors
CREATE POLICY "Everyone can view active colors"
ON public.available_colors
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'));

-- RLS Policy: Only admins can manage colors
CREATE POLICY "Only admins can manage colors"
ON public.available_colors
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_available_colors_updated_at
BEFORE UPDATE ON public.available_colors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default colors from the current PRESET_COLORS
INSERT INTO public.available_colors (color_hex, color_name, sort_order, is_active) VALUES
('#4F8EF7', 'Niebieski', 1, true),
('#9B6BF2', 'Fioletowy', 2, true),
('#22C55E', 'Zielony', 3, true),
('#EF4444', 'Czerwony', 4, true),
('#F59E0B', 'Pomarańczowy', 5, true),
('#8B5CF6', 'Fiolet', 6, true),
('#06B6D4', 'Cyjan', 7, true),
('#EC4899', 'Różowy', 8, true),
('#64748B', 'Szary', 9, true),
('#000000', 'Czarny', 10, true),
('#FFFFFF', 'Biały', 11, true),
('#6B7280', 'Szary Ciemny', 12, true);