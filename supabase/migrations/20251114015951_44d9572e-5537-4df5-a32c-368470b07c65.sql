-- Atualizar políticas da tabela clients para dar acesso total aos admins

-- Drop políticas antigas
DROP POLICY IF EXISTS "Advisors can create clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Advisors can view clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Advisors can update clients in their organization" ON public.clients;
DROP POLICY IF EXISTS "Advisors can delete clients in their organization" ON public.clients;

-- Criar novas políticas com acesso total para admins
CREATE POLICY "Admins and advisors can create clients"
ON public.clients
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'assessor') OR has_role(auth.uid(), 'gestor'))
  )
);

CREATE POLICY "Admins and advisors can view clients"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'assessor') OR has_role(auth.uid(), 'gestor'))
  )
);

CREATE POLICY "Admins and advisors can update clients"
ON public.clients
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'assessor') OR has_role(auth.uid(), 'gestor'))
  )
);

CREATE POLICY "Admins and advisors can delete clients"
ON public.clients
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  (
    organization_id = get_user_organization(auth.uid()) AND
    (has_role(auth.uid(), 'assessor') OR has_role(auth.uid(), 'gestor'))
  )
);

-- Atualizar políticas de assets para admins
DROP POLICY IF EXISTS "Advisors can create assets in their organization" ON public.assets;
DROP POLICY IF EXISTS "Advisors can view assets in their organization" ON public.assets;
DROP POLICY IF EXISTS "Advisors can update assets in their organization" ON public.assets;
DROP POLICY IF EXISTS "Advisors can delete assets in their organization" ON public.assets;

CREATE POLICY "Admins and advisors can create assets"
ON public.assets
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id OR
  (
    client_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = assets.client_id
      AND c.organization_id = get_user_organization(auth.uid())
    )
  )
);

CREATE POLICY "Admins and advisors can view assets"
ON public.assets
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id OR
  (
    client_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = assets.client_id
      AND c.organization_id = get_user_organization(auth.uid())
    )
  )
);

CREATE POLICY "Admins and advisors can update assets"
ON public.assets
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id OR
  (
    client_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = assets.client_id
      AND c.organization_id = get_user_organization(auth.uid())
    )
  )
);

CREATE POLICY "Admins and advisors can delete assets"
ON public.assets
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR
  auth.uid() = user_id OR
  (
    client_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = assets.client_id
      AND c.organization_id = get_user_organization(auth.uid())
    )
  )
);