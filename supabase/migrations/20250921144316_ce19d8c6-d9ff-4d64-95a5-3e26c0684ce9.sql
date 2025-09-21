-- Fix function search path security issue
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  counter INTEGER;
BEGIN
  -- Get current date in YYYYMMDD format
  new_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
  
  -- Get count of orders today
  SELECT COUNT(*) + 1 INTO counter
  FROM public.orders 
  WHERE DATE(created_at) = CURRENT_DATE;
  
  -- Pad with zeros to make it 4 digits
  new_number := new_number || LPAD(counter::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;