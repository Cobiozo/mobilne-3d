-- Create table for PayU settings
CREATE TABLE IF NOT EXISTS public.payu_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  md5_encrypted TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  environment TEXT NOT NULL DEFAULT 'sandbox', -- 'sandbox' or 'production'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payu_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view PayU settings
CREATE POLICY "Only admins can view PayU settings"
ON public.payu_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Only admins can manage PayU settings
CREATE POLICY "Only admins can manage PayU settings"
ON public.payu_settings
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_payu_settings_updated_at
BEFORE UPDATE ON public.payu_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create functions to encrypt/decrypt PayU credentials
CREATE OR REPLACE FUNCTION public.encrypt_payu_credential(credential TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'payu_encryption_key_2025';
  RETURN encode(extensions.pgp_sym_encrypt(credential, encryption_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_payu_credential(encrypted_credential TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'payu_encryption_key_2025';
  RETURN extensions.pgp_sym_decrypt(decode(encrypted_credential, 'base64'), encryption_key);
END;
$$;