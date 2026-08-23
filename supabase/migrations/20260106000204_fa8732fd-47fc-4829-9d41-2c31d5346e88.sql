-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON invitations;

-- Create a secure RPC function for token validation
-- This uses SECURITY DEFINER to bypass RLS and validate tokens server-side
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
BEGIN
  SELECT email, role, expires_at, accepted_at INTO v_invitation
  FROM invitations
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN json_build_object('valid', false, 'reason', 'not_found');
  END IF;
  
  IF v_invitation.accepted_at IS NOT NULL THEN
    RETURN json_build_object('valid', false, 'reason', 'already_accepted');
  END IF;
  
  IF v_invitation.expires_at < NOW() THEN
    RETURN json_build_object('valid', false, 'reason', 'expired');
  END IF;
  
  RETURN json_build_object(
    'valid', true,
    'email', v_invitation.email,
    'role', v_invitation.role
  );
END;
$$;

-- Create a secure RPC function for marking invitation as accepted
-- Only allows updating if the token is valid
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
BEGIN
  SELECT id, email, role, expires_at, accepted_at INTO v_invitation
  FROM invitations
  WHERE token = p_token;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'not_found');
  END IF;
  
  IF v_invitation.accepted_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'reason', 'already_accepted');
  END IF;
  
  IF v_invitation.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'reason', 'expired');
  END IF;
  
  -- Mark invitation as accepted
  UPDATE invitations 
  SET accepted_at = NOW() 
  WHERE token = p_token;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permissions on the functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;