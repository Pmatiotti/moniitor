-- Update handle_new_user_role to respect invitation roles
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation_role app_role;
BEGIN
  -- Check for pending invitation with this email
  SELECT role INTO v_invitation_role
  FROM public.invitations
  WHERE LOWER(email) = LOWER(NEW.email)
    AND accepted_at IS NULL
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Use invitation role or default to 'cliente'
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(v_invitation_role, 'cliente'::app_role));
  
  -- Mark invitation as accepted
  IF v_invitation_role IS NOT NULL THEN
    UPDATE public.invitations 
    SET accepted_at = NOW() 
    WHERE LOWER(email) = LOWER(NEW.email) 
      AND accepted_at IS NULL;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$$;