-- Add discount_amount column to orders table to track virtual currency usage
ALTER TABLE public.orders
ADD COLUMN discount_amount numeric DEFAULT 0.00;