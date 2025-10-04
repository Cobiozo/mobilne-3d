-- Create function to encrypt SMTP password
CREATE OR REPLACE FUNCTION public.encrypt_smtp_password(password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Use a fixed encryption key (in production, this should be in Supabase secrets)
  encryption_key := 'smtp_encryption_key_2025';
  
  RETURN encode(pgp_sym_encrypt(password, encryption_key), 'base64');
END;
$$;

-- Create function to decrypt SMTP password
CREATE OR REPLACE FUNCTION public.decrypt_smtp_password(encrypted_password TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  encryption_key TEXT;
BEGIN
  -- Use the same encryption key
  encryption_key := 'smtp_encryption_key_2025';
  
  RETURN pgp_sym_decrypt(decode(encrypted_password, 'base64'), encryption_key);
END;
$$;