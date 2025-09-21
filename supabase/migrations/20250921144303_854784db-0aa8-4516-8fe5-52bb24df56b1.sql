-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'shipped')),
  quantity INTEGER NOT NULL DEFAULT 1,
  material TEXT,
  print_settings JSONB,
  special_instructions TEXT,
  total_price DECIMAL(10,2),
  estimated_delivery DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table for complex orders
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2),
  material TEXT,
  color TEXT,
  size_scale DECIMAL(5,2) DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create site_settings table for homepage customization
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customer_notes table for admin notes about customers
CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'support', 'billing', 'technical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_events table for tracking
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  event_data JSONB,
  session_id TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" 
ON public.orders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders" 
ON public.orders 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for order_items
CREATE POLICY "Users can view their order items" 
ON public.order_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
));

CREATE POLICY "Users can create their order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
));

CREATE POLICY "Admins can manage all order items" 
ON public.order_items 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for site_settings
CREATE POLICY "Everyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for customer_notes
CREATE POLICY "Only admins can manage customer notes" 
ON public.customer_notes 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for analytics_events
CREATE POLICY "Users can view their own analytics" 
ON public.analytics_events 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert analytics events" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all analytics" 
ON public.analytics_events 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value, description) VALUES
('homepage_title', '{"pl": "3D Model Viewer", "en": "3D Model Viewer"}', 'Homepage main title'),
('homepage_subtitle', '{"pl": "Profesjonalne przeglądanie i drukowanie modeli 3D", "en": "Professional 3D model viewing and printing"}', 'Homepage subtitle'),
('contact_email', '"info@example.com"', 'Main contact email'),
('company_name', '"Mobilne 3D"', 'Company name'),
('featured_models', '[]', 'Array of featured model IDs'),
('homepage_hero_image', '""', 'URL to hero section background image'),
('pricing_enabled', 'true', 'Enable pricing and orders'),
('maintenance_mode', 'false', 'Enable maintenance mode');

-- Generate order numbers function
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
$$ LANGUAGE plpgsql;