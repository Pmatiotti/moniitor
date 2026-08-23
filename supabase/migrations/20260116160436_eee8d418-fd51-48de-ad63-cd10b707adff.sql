-- Fix the handle_new_user_organization function to use correct ON CONFLICT
CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_auth_record RECORD;
BEGIN
  -- Verificar se email está autorizado em alguma organização
  SELECT organization_id, role, id INTO v_auth_record
  FROM public.authorized_organization_emails
  WHERE LOWER(email) = LOWER(NEW.email) AND used_at IS NULL
  LIMIT 1;
  
  IF FOUND THEN
    -- Vincular usuário à organização no profile
    UPDATE public.profiles 
    SET organization_id = v_auth_record.organization_id
    WHERE id = NEW.id;
    
    -- Adicionar role do usuário na organização
    -- Use correct constraint: (user_id, role, organization_id)
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, v_auth_record.role, v_auth_record.organization_id)
    ON CONFLICT (user_id, role, organization_id) DO NOTHING;
    
    -- Marcar email como usado
    UPDATE public.authorized_organization_emails
    SET used_at = now(), used_by = NEW.id
    WHERE id = v_auth_record.id;
  END IF;
  
  RETURN NEW;
END;
$$;