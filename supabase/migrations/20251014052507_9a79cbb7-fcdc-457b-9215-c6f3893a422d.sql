-- Create function to delete old audit logs (admin only)
CREATE OR REPLACE FUNCTION public.delete_old_audit_logs(days_to_keep integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can delete audit logs';
  END IF;

  -- Delete logs older than specified days
  DELETE FROM public.audit_logs
  WHERE created_at < (now() - (days_to_keep || ' days')::interval);
END;
$$;