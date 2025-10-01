-- Add shipping information fields to orders table
ALTER TABLE public.orders 
ADD COLUMN customer_first_name TEXT,
ADD COLUMN customer_last_name TEXT,
ADD COLUMN customer_email TEXT,
ADD COLUMN customer_phone TEXT,
ADD COLUMN shipping_address TEXT,
ADD COLUMN shipping_city TEXT,
ADD COLUMN shipping_postal_code TEXT,
ADD COLUMN shipping_country TEXT DEFAULT 'Polska',
ADD COLUMN delivery_method TEXT,
ADD COLUMN payment_method TEXT;

COMMENT ON COLUMN public.orders.customer_first_name IS 'Customer first name';
COMMENT ON COLUMN public.orders.customer_last_name IS 'Customer last name';
COMMENT ON COLUMN public.orders.customer_email IS 'Customer email address';
COMMENT ON COLUMN public.orders.customer_phone IS 'Customer phone number';
COMMENT ON COLUMN public.orders.shipping_address IS 'Shipping street address';
COMMENT ON COLUMN public.orders.shipping_city IS 'Shipping city';
COMMENT ON COLUMN public.orders.shipping_postal_code IS 'Shipping postal code';
COMMENT ON COLUMN public.orders.shipping_country IS 'Shipping country';
COMMENT ON COLUMN public.orders.delivery_method IS 'Delivery method (inpost-courier, paczkomaty)';
COMMENT ON COLUMN public.orders.payment_method IS 'Payment method (traditional, payu, blik, paypo, twisto, paypal)';