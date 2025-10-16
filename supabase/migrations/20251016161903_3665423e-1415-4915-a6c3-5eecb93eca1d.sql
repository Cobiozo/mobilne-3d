-- Tabela dla ustawień cookie i polityki prywatności
CREATE TABLE public.cookie_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  cookie_text TEXT NOT NULL DEFAULT 'Ta strona używa plików cookie, aby zapewnić najlepszą jakość korzystania z naszej witryny.',
  accept_button_text TEXT NOT NULL DEFAULT 'Akceptuję',
  reject_button_text TEXT NOT NULL DEFAULT 'Odrzuć',
  privacy_policy_text TEXT,
  privacy_policy_url TEXT,
  cookie_duration_days INTEGER NOT NULL DEFAULT 365,
  position TEXT NOT NULL DEFAULT 'bottom',
  theme TEXT NOT NULL DEFAULT 'light',
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cookie_settings ENABLE ROW LEVEL SECURITY;

-- Polityka - każdy może odczytać
CREATE POLICY "Everyone can view cookie settings"
ON public.cookie_settings
FOR SELECT
USING (true);

-- Polityka - tylko admini mogą zarządzać
CREATE POLICY "Only admins can manage cookie settings"
ON public.cookie_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger dla automatycznej aktualizacji updated_at
CREATE TRIGGER update_cookie_settings_updated_at
BEFORE UPDATE ON public.cookie_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Wstaw domyślne ustawienia
INSERT INTO public.cookie_settings (cookie_text, accept_button_text, reject_button_text, privacy_policy_text)
VALUES (
  'Ta strona używa plików cookie, aby zapewnić najlepszą jakość korzystania z naszej witryny. Klikając "Akceptuję", zgadzasz się na przechowywanie plików cookie na Twoim urządzeniu.',
  'Akceptuję',
  'Odrzuć',
  'Więcej informacji znajdziesz w naszej <a href="/terms" class="underline">Polityce Prywatności</a>.'
);