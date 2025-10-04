-- Drop old functions
DROP FUNCTION IF EXISTS public.encrypt_smtp_password(TEXT);
DROP FUNCTION IF EXISTS public.decrypt_smtp_password(TEXT);

-- Ensure pgcrypto is in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create function to encrypt SMTP password
CREATE OR REPLACE FUNCTION public.encrypt_smtp_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'smtp_encryption_key_2025';
  RETURN encode(extensions.pgp_sym_encrypt(password, encryption_key), 'base64');
END;
$$;

-- Create function to decrypt SMTP password
CREATE OR REPLACE FUNCTION public.decrypt_smtp_password(encrypted_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  encryption_key := 'smtp_encryption_key_2025';
  RETURN extensions.pgp_sym_decrypt(decode(encrypted_password, 'base64'), encryption_key);
END;
$$;