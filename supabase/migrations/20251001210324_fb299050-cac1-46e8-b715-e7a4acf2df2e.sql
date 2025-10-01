-- Create email_logs table for tracking sent emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB
);

-- Create email_templates table for managing email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pl',
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_key, language)
);

-- Create smtp_settings table for SMTP configuration
CREATE TABLE public.smtp_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure BOOLEAN NOT NULL DEFAULT false,
  smtp_user TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_test_at TIMESTAMP WITH TIME ZONE,
  last_test_status TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_logs
CREATE POLICY "Admins can view all email logs"
  ON public.email_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own email logs"
  ON public.email_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert email logs"
  ON public.email_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for email_templates
CREATE POLICY "Everyone can view active templates"
  ON public.email_templates FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage templates"
  ON public.email_templates FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for smtp_settings
CREATE POLICY "Only admins can view SMTP settings"
  ON public.smtp_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage SMTP settings"
  ON public.smtp_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smtp_settings_updated_at
  BEFORE UPDATE ON public.smtp_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default email templates in Polish
INSERT INTO public.email_templates (template_key, language, subject, html_body, text_body, variables) VALUES
('registration_welcome', 'pl', 'Witamy w {{company_name}}!', 
'<h1>Witamy, {{user_name}}!</h1><p>Dziękujemy za rejestrację w {{company_name}}.</p><p>Twoje konto zostało pomyślnie utworzone.</p>', 
'Witamy, {{user_name}}! Dziękujemy za rejestrację w {{company_name}}. Twoje konto zostało pomyślnie utworzone.',
'{"user_name": "Imię użytkownika", "company_name": "Nazwa firmy"}'::jsonb),

('order_confirmation', 'pl', 'Potwierdzenie zamówienia #{{order_number}}',
'<h1>Dziękujemy za zamówienie!</h1><p>Numer zamówienia: <strong>{{order_number}}</strong></p><p>Status: {{order_status}}</p><p>Suma: {{total_price}} PLN</p>',
'Dziękujemy za zamówienie! Numer zamówienia: {{order_number}}. Status: {{order_status}}. Suma: {{total_price}} PLN.',
'{"order_number": "Numer zamówienia", "order_status": "Status", "total_price": "Cena"}'::jsonb),

('order_status_change', 'pl', 'Zmiana statusu zamówienia #{{order_number}}',
'<h1>Status zamówienia został zmieniony</h1><p>Numer zamówienia: <strong>{{order_number}}</strong></p><p>Nowy status: <strong>{{new_status}}</strong></p><p>{{status_message}}</p>',
'Status zamówienia {{order_number}} został zmieniony na: {{new_status}}. {{status_message}}',
'{"order_number": "Numer zamówienia", "new_status": "Nowy status", "status_message": "Wiadomość"}'::jsonb),

('profile_change', 'pl', 'Zmiana danych konta',
'<h1>Dane Twojego konta zostały zmienione</h1><p>Witaj {{user_name}},</p><p>Informujemy, że dane Twojego konta zostały zaktualizowane.</p><p>Jeśli to nie Ty, skontaktuj się z nami natychmiast.</p>',
'Witaj {{user_name}}, Dane Twojego konta zostały zaktualizowane. Jeśli to nie Ty, skontaktuj się z nami.',
'{"user_name": "Imię użytkownika"}'::jsonb),

('admin_new_order', 'pl', 'Nowe zamówienie #{{order_number}}',
'<h1>Otrzymano nowe zamówienie</h1><p>Numer: <strong>{{order_number}}</strong></p><p>Klient: {{customer_name}}</p><p>Email: {{customer_email}}</p><p>Suma: {{total_price}} PLN</p>',
'Nowe zamówienie {{order_number}} od {{customer_name}} ({{customer_email}}). Suma: {{total_price}} PLN.',
'{"order_number": "Numer", "customer_name": "Klient", "customer_email": "Email", "total_price": "Cena"}'::jsonb);

-- Insert English versions
INSERT INTO public.email_templates (template_key, language, subject, html_body, text_body, variables) VALUES
('registration_welcome', 'en', 'Welcome to {{company_name}}!',
'<h1>Welcome, {{user_name}}!</h1><p>Thank you for registering with {{company_name}}.</p><p>Your account has been successfully created.</p>',
'Welcome, {{user_name}}! Thank you for registering with {{company_name}}. Your account has been successfully created.',
'{"user_name": "User name", "company_name": "Company name"}'::jsonb),

('order_confirmation', 'en', 'Order Confirmation #{{order_number}}',
'<h1>Thank you for your order!</h1><p>Order number: <strong>{{order_number}}</strong></p><p>Status: {{order_status}}</p><p>Total: {{total_price}} PLN</p>',
'Thank you for your order! Order number: {{order_number}}. Status: {{order_status}}. Total: {{total_price}} PLN.',
'{"order_number": "Order number", "order_status": "Status", "total_price": "Price"}'::jsonb),

('order_status_change', 'en', 'Order Status Update #{{order_number}}',
'<h1>Order status has been updated</h1><p>Order number: <strong>{{order_number}}</strong></p><p>New status: <strong>{{new_status}}</strong></p><p>{{status_message}}</p>',
'Order {{order_number}} status changed to: {{new_status}}. {{status_message}}',
'{"order_number": "Order number", "new_status": "New status", "status_message": "Message"}'::jsonb),

('profile_change', 'en', 'Account Information Changed',
'<h1>Your account information has been updated</h1><p>Hello {{user_name}},</p><p>We inform you that your account data has been updated.</p><p>If this wasn''t you, please contact us immediately.</p>',
'Hello {{user_name}}, Your account data has been updated. If this wasn''t you, please contact us.',
'{"user_name": "User name"}'::jsonb),

('admin_new_order', 'en', 'New Order #{{order_number}}',
'<h1>New order received</h1><p>Number: <strong>{{order_number}}</strong></p><p>Customer: {{customer_name}}</p><p>Email: {{customer_email}}</p><p>Total: {{total_price}} PLN</p>',
'New order {{order_number}} from {{customer_name}} ({{customer_email}}). Total: {{total_price}} PLN.',
'{"order_number": "Number", "customer_name": "Customer", "customer_email": "Email", "total_price": "Price"}'::jsonb);

-- Create indexes for better performance
CREATE INDEX idx_email_logs_user_id ON public.email_logs(user_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_templates_key_lang ON public.email_templates(template_key, language);
CREATE INDEX idx_smtp_settings_active ON public.smtp_settings(is_active);