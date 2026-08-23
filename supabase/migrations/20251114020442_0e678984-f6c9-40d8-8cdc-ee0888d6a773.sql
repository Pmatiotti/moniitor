-- POLÍTICAS DE SEGMENTAÇÃO POR PERFIL
-- Admin: acesso total
-- Gestor: vê toda organização
-- Assessor: vê apenas seus clientes
-- Cliente: vê apenas própria conta

-- ============================================
-- TABELA: clients
-- ============================================
DO $$ 
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'clients' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', pol_name);
    END LOOP;
END $$;

-- Admin tem acesso total
CREATE POLICY "admin_full_access_clients"
ON public.clients FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Gestor vê todos clientes da sua organização
CREATE POLICY "gestor_view_org_clients"
ON public.clients FOR SELECT
USING (
  has_role(auth.uid(), 'gestor') AND
  organization_id = get_user_organization(auth.uid())
);

-- Gestor pode criar/editar clientes na sua organização
CREATE POLICY "gestor_manage_org_clients"
ON public.clients FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'gestor') AND
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "gestor_update_org_clients"
ON public.clients FOR UPDATE
USING (
  has_role(auth.uid(), 'gestor') AND
  organization_id = get_user_organization(auth.uid())
);

CREATE POLICY "gestor_delete_org_clients"
ON public.clients FOR DELETE
USING (
  has_role(auth.uid(), 'gestor') AND
  organization_id = get_user_organization(auth.uid())
);

-- Assessor vê apenas clientes onde ele é o advisor
CREATE POLICY "assessor_view_own_clients"
ON public.clients FOR SELECT
USING (
  has_role(auth.uid(), 'assessor') AND
  advisor_id = auth.uid()
);

-- Assessor pode criar clientes na sua organização
CREATE POLICY "assessor_create_clients"
ON public.clients FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'assessor') AND
  advisor_id = auth.uid() AND
  organization_id = get_user_organization(auth.uid())
);

-- Assessor pode editar apenas seus clientes
CREATE POLICY "assessor_update_own_clients"
ON public.clients FOR UPDATE
USING (
  has_role(auth.uid(), 'assessor') AND
  advisor_id = auth.uid()
);

CREATE POLICY "assessor_delete_own_clients"
ON public.clients FOR DELETE
USING (
  has_role(auth.uid(), 'assessor') AND
  advisor_id = auth.uid()
);

-- Cliente vê apenas seu próprio perfil
CREATE POLICY "cliente_view_own_profile"
ON public.clients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE client_advisor_links.client_id = auth.uid()
    AND client_advisor_links.client_id = clients.id
  )
);

-- ============================================
-- TABELA: assets
-- ============================================
DO $$ 
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'assets' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.assets', pol_name);
    END LOOP;
END $$;

-- Admin tem acesso total
CREATE POLICY "admin_full_access_assets"
ON public.assets FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Gestor vê todos assets de clientes da organização
CREATE POLICY "gestor_view_org_assets"
ON public.assets FOR SELECT
USING (
  has_role(auth.uid(), 'gestor') AND
  (
    (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = assets.client_id
      AND clients.organization_id = get_user_organization(auth.uid())
    ))
    OR user_id = auth.uid()
  )
);

-- Assessor vê apenas assets dos seus clientes
CREATE POLICY "assessor_view_own_client_assets"
ON public.assets FOR SELECT
USING (
  has_role(auth.uid(), 'assessor') AND
  (
    (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = assets.client_id
      AND clients.advisor_id = auth.uid()
    ))
    OR user_id = auth.uid()
  )
);

-- Assessor pode gerenciar assets dos seus clientes
CREATE POLICY "assessor_manage_own_client_assets"
ON public.assets FOR ALL
USING (
  has_role(auth.uid(), 'assessor') AND
  client_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = assets.client_id
    AND clients.advisor_id = auth.uid()
  )
);

-- Usuários podem gerenciar próprios assets
CREATE POLICY "user_manage_own_assets"
ON public.assets FOR ALL
USING (auth.uid() = user_id);

-- ============================================
-- TABELA: financial_goals
-- ============================================
DO $$ 
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'financial_goals' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.financial_goals', pol_name);
    END LOOP;
END $$;

-- Admin tem acesso total
CREATE POLICY "admin_full_access_goals"
ON public.financial_goals FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Gestor vê metas de clientes da organização
CREATE POLICY "gestor_view_org_goals"
ON public.financial_goals FOR SELECT
USING (
  has_role(auth.uid(), 'gestor') AND
  (
    (client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = financial_goals.client_id
      AND clients.organization_id = get_user_organization(auth.uid())
    ))
    OR user_id = auth.uid()
  )
);

-- Assessor vê metas dos seus clientes
CREATE POLICY "assessor_view_own_client_goals"
ON public.financial_goals FOR SELECT
USING (
  (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = financial_goals.client_id
    AND clients.advisor_id = auth.uid()
  ))
  OR user_id = auth.uid()
);

-- Assessor pode criar metas para seus clientes
CREATE POLICY "assessor_create_client_goals"
ON public.financial_goals FOR INSERT
WITH CHECK (
  client_id IS NOT NULL AND
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = financial_goals.client_id
    AND clients.advisor_id = auth.uid()
  )
);

-- Assessor pode editar metas dos seus clientes
CREATE POLICY "assessor_update_client_goals"
ON public.financial_goals FOR UPDATE
USING (
  client_id IS NOT NULL AND
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = financial_goals.client_id
    AND clients.advisor_id = auth.uid()
  )
);

-- Usuários podem gerenciar próprias metas
CREATE POLICY "user_manage_own_goals"
ON public.financial_goals FOR ALL
USING (auth.uid() = user_id AND client_id IS NULL);

-- Clientes podem ver metas criadas por assessores para eles
CREATE POLICY "cliente_view_advisor_goals"
ON public.financial_goals FOR SELECT
USING (
  auth.uid() = client_id OR
  (client_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE client_advisor_links.client_id = auth.uid()
    AND client_advisor_links.advisor_id = financial_goals.user_id
  ))
);

-- ============================================
-- TABELA: dividends
-- ============================================
DO $$ 
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'dividends' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.dividends', pol_name);
    END LOOP;
END $$;

-- Admin acesso total
CREATE POLICY "admin_full_access_dividends"
ON public.dividends FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Gestor vê dividends de clientes da organização
CREATE POLICY "gestor_view_org_dividends"
ON public.dividends FOR SELECT
USING (
  has_role(auth.uid(), 'gestor') AND
  EXISTS (
    SELECT 1 FROM assets a
    JOIN clients c ON c.id = a.client_id
    WHERE a.user_id = dividends.user_id
    AND c.organization_id = get_user_organization(auth.uid())
  )
);

-- Assessor vê dividends dos seus clientes
CREATE POLICY "assessor_view_client_dividends"
ON public.dividends FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assets a
    JOIN clients c ON c.id = a.client_id
    WHERE a.user_id = dividends.user_id
    AND c.advisor_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Usuários gerenciam próprios dividends
CREATE POLICY "user_manage_own_dividends"
ON public.dividends FOR ALL
USING (auth.uid() = user_id);