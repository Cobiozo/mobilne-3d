-- Funkcja sprawdzająca czy można zmienić rolę administratora
CREATE OR REPLACE FUNCTION public.can_change_admin_role(user_id_to_change uuid, new_role app_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  admin_count integer;
BEGIN
  -- Pobierz ID obecnie zalogowanego użytkownika
  current_user_id := auth.uid();
  
  -- Sprawdź czy użytkownik próbuje usunąć sobie uprawnienia administratora
  IF current_user_id = user_id_to_change AND new_role = 'user' THEN
    -- Sprawdź czy to jest jego obecna rola admin
    IF EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = current_user_id AND role = 'admin'
    ) THEN
      RETURN false; -- Nie można usunąć sobie uprawnień administratora
    END IF;
  END IF;
  
  -- Sprawdź czy to nie jest ostatni administrator w systemie
  IF new_role = 'user' THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles 
    WHERE role = 'admin' AND user_id != user_id_to_change;
    
    IF admin_count = 0 THEN
      RETURN false; -- Nie można usunąć ostatniego administratora
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Trigger function dla user_roles
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sprawdź tylko przy UPDATE gdy role się zmienia
  IF TG_OP = 'UPDATE' AND OLD.role != NEW.role THEN
    IF NOT public.can_change_admin_role(NEW.user_id, NEW.role) THEN
      RAISE EXCEPTION 'Cannot change admin role: either self-demotion or removing last admin';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Dodaj trigger do tabeli user_roles
DROP TRIGGER IF EXISTS validate_role_change_trigger ON public.user_roles;
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();