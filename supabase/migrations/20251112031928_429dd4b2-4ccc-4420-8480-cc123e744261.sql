-- ============================================
-- POLICIES PARA ASSESSORES E GESTORES
-- ============================================

-- ASSETS: Assessores podem ver assets dos seus clientes
CREATE POLICY "Advisors can view their clients assets"
ON public.assets
FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.client_id = assets.client_id
    AND client_advisor_links.status = 'active'
  )
);

-- ASSETS: Assessores podem criar assets para seus clientes
CREATE POLICY "Advisors can create assets for their clients"
ON public.assets
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.client_id = assets.client_id
    AND client_advisor_links.status = 'active'
  )
);

-- ASSETS: Assessores podem atualizar assets dos seus clientes
CREATE POLICY "Advisors can update their clients assets"
ON public.assets
FOR UPDATE
TO authenticated
USING (
  client_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.client_id = assets.client_id
    AND client_advisor_links.status = 'active'
  )
);

-- ASSETS: Assessores podem deletar assets dos seus clientes
CREATE POLICY "Advisors can delete their clients assets"
ON public.assets
FOR DELETE
TO authenticated
USING (
  client_id IS NOT NULL 
  AND EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.client_id = assets.client_id
    AND client_advisor_links.status = 'active'
  )
);

-- ASSETS: Gestores podem ver todos os assets dos clientes (read-only)
CREATE POLICY "Managers can view all client assets"
ON public.assets
FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'
  )
);

-- DIVIDENDS: Assessores podem ver dividends dos seus clientes
CREATE POLICY "Advisors can view their clients dividends"
ON public.dividends
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    INNER JOIN public.assets a ON a.client_id = cal.client_id
    WHERE cal.advisor_id = auth.uid()
    AND cal.status = 'active'
    AND a.user_id = dividends.user_id
  )
);

-- DIVIDENDS: Gestores podem ver todos os dividends
CREATE POLICY "Managers can view all dividends"
ON public.dividends
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'
  )
);

-- ALERTS: Assessores podem ver alerts dos seus clientes
CREATE POLICY "Advisors can view their clients alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    WHERE cal.advisor_id = auth.uid()
    AND cal.client_id = alerts.user_id
    AND cal.status = 'active'
  )
);

-- ALERTS: Gestores podem ver todos os alerts
CREATE POLICY "Managers can view all alerts"
ON public.alerts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'
  )
);

-- TRANSACTIONS: Assessores podem ver transactions dos seus clientes
CREATE POLICY "Advisors can view their clients transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.client_id = transactions.user_id
    AND client_advisor_links.status = 'active'
  )
);

-- TRANSACTIONS: Gestores podem ver todas as transactions
CREATE POLICY "Managers can view all transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'gestor'
  )
);

-- CATEGORIES: Assessores podem ver categories dos seus clientes
CREATE POLICY "Advisors can view their clients categories"
ON public.categories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.client_id = categories.user_id
    AND client_advisor_links.status = 'active'
  )
);

-- BUDGETS: Assessores podem ver budgets dos seus clientes
CREATE POLICY "Advisors can view their clients budgets"
ON public.budgets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.client_id = budgets.user_id
    AND client_advisor_links.status = 'active'
  )
);

-- CLIENTES: Podem ver seus próprios dados como cliente vinculado
CREATE POLICY "Clients can view their own client profile"
ON public.clients
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_advisor_links.client_id = auth.uid()
    AND client_advisor_links.client_id = clients.id
  )
);