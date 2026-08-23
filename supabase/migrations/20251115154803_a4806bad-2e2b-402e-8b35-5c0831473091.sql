
-- Remover trigger duplicado
DROP TRIGGER IF EXISTS on_auth_user_role_created ON auth.users;

-- Recriar a função handle_new_user_role SEM o ON CONFLICT problemático
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Adicionar role 'cliente' automaticamente para todos os novos usuários
  -- Removido ON CONFLICT pois a constraint inclui organization_id que é NULL aqui
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente'::app_role);
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Ignora se já existe (não deveria acontecer, mas por segurança)
    RETURN NEW;
END;
$$;
