-- Update user role to admin for the specified email
UPDATE public.user_roles 
SET role = 'admin' 
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'Biuro@mobilne-it.pl'
);

-- If no user role exists yet, insert it
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'Biuro@mobilne-it.pl'
AND id NOT IN (SELECT user_id FROM public.user_roles WHERE user_id = auth.users.id);