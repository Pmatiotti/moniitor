-- Tabela para armazenar planos financeiros criados por assessores para clientes
CREATE TABLE IF NOT EXISTS public.financial_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_type text NOT NULL, -- 'retirement', 'succession', 'tax', 'cashflow', 'risk'
  title text NOT NULL,
  description text,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- 'draft', 'active', 'completed', 'archived'
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reviewed_by_client_at timestamp with time zone
);

-- Índices para performance
CREATE INDEX idx_financial_plans_client ON public.financial_plans(client_id);
CREATE INDEX idx_financial_plans_advisor ON public.financial_plans(advisor_id);
CREATE INDEX idx_financial_plans_type ON public.financial_plans(plan_type);

-- RLS policies
ALTER TABLE public.financial_plans ENABLE ROW LEVEL SECURITY;

-- Admin acesso total
CREATE POLICY "admin_full_access_plans"
ON public.financial_plans FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Gestor vê planos de clientes da organização
CREATE POLICY "gestor_view_org_plans"
ON public.financial_plans FOR SELECT
USING (
  has_role(auth.uid(), 'gestor') AND
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = financial_plans.client_id
    AND clients.organization_id = get_user_organization(auth.uid())
  )
);

-- Assessor gerencia planos dos seus clientes
CREATE POLICY "assessor_manage_own_client_plans"
ON public.financial_plans FOR ALL
USING (
  advisor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = financial_plans.client_id
    AND clients.advisor_id = auth.uid()
  )
);

-- Cliente vê seus próprios planos
CREATE POLICY "cliente_view_own_plans"
ON public.financial_plans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE client_advisor_links.client_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = financial_plans.client_id
      AND clients.id = (
        SELECT id FROM clients WHERE id IN (
          SELECT client_id FROM client_advisor_links WHERE client_id = auth.uid()
        )
      )
    )
  )
);

-- Cliente pode marcar plano como revisado
CREATE POLICY "cliente_update_reviewed_date"
ON public.financial_plans FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links cal
    JOIN clients c ON c.id = financial_plans.client_id
    WHERE cal.client_id = auth.uid()
  )
)
WITH CHECK (
  reviewed_by_client_at IS NOT NULL
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_financial_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER financial_plans_updated_at
BEFORE UPDATE ON public.financial_plans
FOR EACH ROW
EXECUTE FUNCTION update_financial_plans_updated_at();