-- Remover TODAS as políticas antigas de clients e assets primeiro
DO $$ 
DECLARE
    pol_name text;
BEGIN
    -- Drop all policies for clients table
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', pol_name);
    END LOOP;
    
    -- Drop all policies for assets table  
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'assets' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.assets', pol_name);
    END LOOP;
END $$;

-- Criar políticas de clients com acesso total para admins
CREATE POLICY "Admins have full access to clients"
ON public.clients
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Advisors can manage clients in their organization"
ON public.clients
FOR ALL
USING (
  organization_id = get_user_organization(auth.uid()) AND
  (has_role(auth.uid(), 'assessor') OR has_role(auth.uid(), 'gestor'))
);

CREATE POLICY "Clients can view their own profile"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE client_advisor_links.client_id = auth.uid()
    AND client_advisor_links.client_id = clients.id
  )
);

CREATE POLICY "Managers can view all clients"
ON public.clients
FOR SELECT
USING (has_role(auth.uid(), 'gestor'));

-- Criar políticas de assets com acesso total para admins
CREATE POLICY "Admins have full access to assets"
ON public.assets
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage own assets"
ON public.assets
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all client assets"
ON public.assets
FOR SELECT
USING (
  client_id IS NOT NULL AND
  has_role(auth.uid(), 'gestor')
);

CREATE POLICY "Advisors can manage client assets in their organization"
ON public.assets
FOR ALL
USING (
  client_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM clients c
    WHERE c.id = assets.client_id
    AND c.organization_id = get_user_organization(auth.uid())
    AND has_role(auth.uid(), 'assessor')
  )
);