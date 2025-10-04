-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted password column to smtp_settings
ALTER TABLE public.smtp_settings 
ADD COLUMN smtp_password_encrypted TEXT;

-- Add comment
COMMENT ON COLUMN public.smtp_settings.smtp_password_encrypted IS 'Encrypted SMTP password using pgp_sym_encrypt';