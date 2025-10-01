-- Table for system notifications
CREATE TABLE IF NOT EXISTS public.system_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'error', 'success')),
  target_users TEXT NOT NULL DEFAULT 'all' CHECK (target_users IN ('all', 'admins', 'users')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_label TEXT
);

-- Enable RLS
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Admins can manage all notifications"
  ON public.system_notifications
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their notifications"
  ON public.system_notifications
  FOR SELECT
  USING (
    (target_users = 'all') OR
    (target_users = 'users' AND NOT has_role(auth.uid(), 'admin'::app_role)) OR
    (target_users = 'admins' AND has_role(auth.uid(), 'admin'::app_role)) OR
    (user_id = auth.uid())
  );

CREATE POLICY "Users can mark their notifications as read"
  ON public.system_notifications
  FOR UPDATE
  USING (user_id = auth.uid() OR auth.uid() IS NOT NULL)
  WITH CHECK (user_id = auth.uid() OR auth.uid() IS NOT NULL);

-- Table for audit/security logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies for audit logs
CREATE POLICY "Only admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Table for admin notes (global notes, not customer-specific)
CREATE TABLE IF NOT EXISTS public.admin_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'important', 'todo', 'reminder')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  tags TEXT[]
);

-- Enable RLS
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;

-- Policies for admin notes
CREATE POLICY "Only admins can manage admin notes"
  ON public.admin_notes
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_admin_notes_updated_at
  BEFORE UPDATE ON public.admin_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_system_notifications_user_id ON public.system_notifications(user_id);
CREATE INDEX idx_system_notifications_created_at ON public.system_notifications(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX idx_admin_notes_created_at ON public.admin_notes(created_at DESC);
CREATE INDEX idx_admin_notes_priority ON public.admin_notes(priority);