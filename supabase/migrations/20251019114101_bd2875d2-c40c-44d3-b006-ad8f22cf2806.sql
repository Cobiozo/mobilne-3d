-- Create table for Google Site Kit configuration
CREATE TABLE public.google_site_kit_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  google_client_id TEXT NOT NULL,
  google_client_secret_encrypted TEXT,
  google_api_key_encrypted TEXT,
  is_configured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  verified_domains TEXT[],
  last_sync_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.google_site_kit_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view Google Site Kit settings
CREATE POLICY "Only admins can view Google Site Kit settings"
ON public.google_site_kit_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage Google Site Kit settings
CREATE POLICY "Only admins can manage Google Site Kit settings"
ON public.google_site_kit_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Create encryption functions for Google credentials
CREATE OR REPLACE FUNCTION public.encrypt_google_credential(credential TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'google_encryption_key_2025';
  RETURN encode(extensions.pgp_sym_encrypt(credential, encryption_key), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_google_credential(encrypted_credential TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'google_encryption_key_2025';
  RETURN extensions.pgp_sym_decrypt(decode(encrypted_credential, 'base64'), encryption_key);
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_google_site_kit_settings_updated_at
BEFORE UPDATE ON public.google_site_kit_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();