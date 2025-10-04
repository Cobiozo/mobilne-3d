-- Make encrypted credential fields nullable since they might not be set initially
ALTER TABLE public.payu_settings 
  ALTER COLUMN md5_encrypted DROP NOT NULL,
  ALTER COLUMN client_secret_encrypted DROP NOT NULL;