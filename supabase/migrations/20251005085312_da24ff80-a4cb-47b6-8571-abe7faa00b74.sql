-- Fix payment_methods RLS policy to prevent public exposure of sensitive config data
-- Drop the existing policy that allows everyone to view active payment methods
DROP POLICY IF EXISTS "Everyone can view active payment methods" ON public.payment_methods;

-- Create new policy that requires authentication to view payment methods
CREATE POLICY "Authenticated users can view active payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can still view all payment methods (active or inactive)
-- This is already covered by the existing "Only admins can manage payment methods" policy