-- Drop the old table and recreate with proper structure
DROP TABLE IF EXISTS public.active_sessions CASCADE;

-- Create active_sessions table with session tracking
CREATE TABLE public.active_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text NOT NULL UNIQUE,
  ip_address inet,
  user_agent text,
  last_activity timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Only admins can view sessions
CREATE POLICY "Admins can view all sessions"
  ON public.active_sessions
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can manage their own sessions
CREATE POLICY "Users can manage their own session"
  ON public.active_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_active_sessions_user_id ON public.active_sessions(user_id);
CREATE INDEX idx_active_sessions_session_id ON public.active_sessions(session_id);
CREATE INDEX idx_active_sessions_last_activity ON public.active_sessions(last_activity DESC);