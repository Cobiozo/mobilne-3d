-- Add invoice_data column to orders table
ALTER TABLE public.orders 
ADD COLUMN invoice_data jsonb;