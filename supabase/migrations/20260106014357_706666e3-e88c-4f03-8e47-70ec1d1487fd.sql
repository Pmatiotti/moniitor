-- Fase 1: Trigger para vincular usuário à organização automaticamente
-- Quando um novo usuário faz signup, verifica se o email está autorizado em alguma organização

CREATE OR REPLACE FUNCTION public.handle_new_user_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (NEW.id, v_auth_record.role, v_auth_record.organization_id)
    ON CONFLICT (user_id, role) DO UPDATE 
    SET organization_id = v_auth_record.organization_id;
    
    -- Marcar email como usado
    UPDATE public.authorized_organization_emails
    SET used_at = now(), used_by = NEW.id
    WHERE id = v_auth_record.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa APÓS o handle_new_user (que cria o profile)
DROP TRIGGER IF EXISTS on_auth_user_created_organization ON auth.users;
CREATE TRIGGER on_auth_user_created_organization
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_organization();

-- Fase 2: Adicionar colunas para subscription por organização
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 1;

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS billing_email text;

-- Índice para buscar subscription por organização
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization_id ON public.subscriptions(organization_id);

-- Função para verificar subscription da organização
CREATE OR REPLACE FUNCTION public.get_organization_subscription(_organization_id uuid)
RETURNS TABLE (
  plan_type subscription_plan,
  status text,
  max_users integer,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    s.plan_type,
    s.status,
    s.max_users,
    s.current_period_end
  FROM public.subscriptions s
  WHERE s.organization_id = _organization_id
    AND s.status IN ('trialing', 'active')
    AND (
      (s.status = 'trialing' AND s.trial_end > now())
      OR (s.status = 'active' AND s.current_period_end > now())
    )
  LIMIT 1;
$$;

-- Função para contar usuários ativos de uma organização
CREATE OR REPLACE FUNCTION public.count_organization_users(_organization_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer
  FROM public.profiles
  WHERE organization_id = _organization_id;
$$;

-- Função para verificar se organização pode adicionar mais usuários
CREATE OR REPLACE FUNCTION public.can_organization_add_user(_organization_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_users integer;
  v_current_users integer;
BEGIN
  -- Buscar limite de usuários da subscription
  SELECT max_users INTO v_max_users
  FROM public.subscriptions
  WHERE organization_id = _organization_id
    AND status IN ('trialing', 'active')
  LIMIT 1;
  
  -- Se não tem subscription, não pode adicionar
  IF v_max_users IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Contar usuários atuais
  SELECT public.count_organization_users(_organization_id) INTO v_current_users;
  
  -- Retornar se pode adicionar
  RETURN v_current_users < v_max_users;
END;
$$;