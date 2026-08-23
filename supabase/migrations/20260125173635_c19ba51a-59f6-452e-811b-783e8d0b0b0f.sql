-- Create advisor_client_invitations table for secure linking
CREATE TABLE public.advisor_client_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_email TEXT NOT NULL,
  client_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  invitation_type TEXT NOT NULL CHECK (invitation_type IN ('new_user', 'existing_user')),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(advisor_id, client_email, status) -- Prevent duplicate pending invites
);

-- Enable RLS
ALTER TABLE public.advisor_client_invitations ENABLE ROW LEVEL SECURITY;

-- Advisors can view and create their own invitations
CREATE POLICY "Advisors can view own invitations"
ON public.advisor_client_invitations
FOR SELECT
USING (advisor_id = auth.uid());

CREATE POLICY "Advisors can create invitations"
ON public.advisor_client_invitations
FOR INSERT
WITH CHECK (
  advisor_id = auth.uid() 
  AND public.has_role(auth.uid(), 'assessor')
);

-- Clients can view invitations addressed to their email
CREATE POLICY "Clients can view invitations to their email"
ON public.advisor_client_invitations
FOR SELECT
USING (
  client_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND LOWER(email) = LOWER(advisor_client_invitations.client_email)
  )
);

-- Clients can update (accept/reject) invitations addressed to them
CREATE POLICY "Clients can respond to their invitations"
ON public.advisor_client_invitations
FOR UPDATE
USING (
  client_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND LOWER(email) = LOWER(advisor_client_invitations.client_email)
  )
)
WITH CHECK (
  status IN ('accepted', 'rejected')
);

-- Admins can view all
CREATE POLICY "Admins can view all invitations"
ON public.advisor_client_invitations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_advisor_client_invitations_email ON public.advisor_client_invitations(LOWER(client_email));
CREATE INDEX idx_advisor_client_invitations_advisor ON public.advisor_client_invitations(advisor_id);
CREATE INDEX idx_advisor_client_invitations_status ON public.advisor_client_invitations(status) WHERE status = 'pending';
CREATE INDEX idx_advisor_client_invitations_token ON public.advisor_client_invitations(token);

-- Function to auto-link client when accepting invitation
CREATE OR REPLACE FUNCTION public.accept_advisor_invitation(p_invitation_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_advisor_name TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  -- Get invitation
  SELECT * INTO v_invitation
  FROM public.advisor_client_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite não encontrado ou expirado');
  END IF;
  
  -- Verify user is the intended recipient
  IF v_invitation.client_user_id IS NOT NULL AND v_invitation.client_user_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Este convite não é para você');
  END IF;
  
  -- Get advisor name
  SELECT full_name INTO v_advisor_name
  FROM public.profiles
  WHERE id = v_invitation.advisor_id;
  
  -- Update invitation status
  UPDATE public.advisor_client_invitations
  SET status = 'accepted',
      responded_at = now(),
      client_user_id = v_user_id
  WHERE id = p_invitation_id;
  
  -- Create client_advisor_links
  INSERT INTO public.client_advisor_links (client_id, advisor_id, status)
  VALUES (v_user_id, v_invitation.advisor_id, 'active')
  ON CONFLICT DO NOTHING;
  
  -- Create client record in clients table for CRM
  INSERT INTO public.clients (
    advisor_id,
    user_id,
    name,
    email,
    status,
    onboarding_date
  )
  SELECT 
    v_invitation.advisor_id,
    v_user_id,
    COALESCE(p.full_name, 'Cliente'),
    p.email,
    'ativo',
    CURRENT_DATE
  FROM public.profiles p
  WHERE p.id = v_user_id
  ON CONFLICT DO NOTHING;
  
  RETURN json_build_object(
    'success', true, 
    'advisor_name', v_advisor_name
  );
END;
$$;

-- Function to reject invitation
CREATE OR REPLACE FUNCTION public.reject_advisor_invitation(p_invitation_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;
  
  UPDATE public.advisor_client_invitations
  SET status = 'rejected',
      responded_at = now()
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND (
      client_user_id = v_user_id
      OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = v_user_id 
        AND LOWER(email) = LOWER(advisor_client_invitations.client_email)
      )
    );
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Convite não encontrado');
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$;