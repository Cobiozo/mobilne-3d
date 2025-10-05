-- Create table for price coefficients
CREATE TABLE IF NOT EXISTS public.price_coefficients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coefficient_name text NOT NULL,
  coefficient_value numeric NOT NULL DEFAULT 1.0,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_coefficients ENABLE ROW LEVEL SECURITY;

-- Only admins can manage price coefficients
CREATE POLICY "Only admins can manage price coefficients"
ON public.price_coefficients
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view active price coefficients for calculations
CREATE POLICY "Authenticated users can view active coefficients"
ON public.price_coefficients
FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_price_coefficients_updated_at
BEFORE UPDATE ON public.price_coefficients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default price coefficient
INSERT INTO public.price_coefficients (coefficient_name, coefficient_value, description, is_active)
VALUES ('Współczynnik ceny za cm³', 0.10, 'Cena za jeden centymetr sześcienny objętości modelu', true);