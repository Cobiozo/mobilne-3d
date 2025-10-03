-- Create payment methods table
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view active payment methods"
  ON public.payment_methods
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage payment methods"
  ON public.payment_methods
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default payment methods
INSERT INTO public.payment_methods (method_key, name, description, is_active, sort_order) VALUES
('traditional', 'Przelew tradycyjny', 'Standardowy przelew bankowy', true, 1),
('payu_standard', 'PayU - standard', 'Podstawowa integracja PayU z wszystkimi metodami płatności', true, 2),
('payu_card', 'PayU - karta kredytowa', 'Płatność kartą kredytową/debetową', false, 3),
('payu_blik', 'PayU - Blik', 'Płatność kodem Blik z aplikacji bankowej', true, 4),
('payu_bank_list', 'PayU - lista banków', 'Wybór banku z listy', false, 5),
('payu_installments', 'PayU - raty', 'Płatność ratalna', true, 6),
('payu_klarna', 'PayU - Klarna', 'Kup teraz, zapłać później z Klarna', false, 7),
('payu_paypo', 'PayU - PayPo', 'Odroczona płatność PayPo', true, 8),
('payu_twisto', 'PayU - Twisto', 'Płatność odroczona Twisto', true, 9),
('payu_twisto_3', 'PayU - Twisto podziel na 3', 'Płatność w 3 ratach Twisto', false, 10),
('payu_secure_form', 'PayU - secure form', 'Bezpieczny formularz płatności', false, 11);

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();