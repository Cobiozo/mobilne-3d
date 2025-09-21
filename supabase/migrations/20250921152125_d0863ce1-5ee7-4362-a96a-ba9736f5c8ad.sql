-- Przywróć uprawnienia administratora dla biuro@mobilne-it.pl
UPDATE user_roles 
SET role = 'admin'::app_role 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'biuro@mobilne-it.pl'
);