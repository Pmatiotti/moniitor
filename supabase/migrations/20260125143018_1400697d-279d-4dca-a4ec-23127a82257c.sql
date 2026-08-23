-- Tornar client_id nullable
ALTER TABLE public.financial_plans 
ALTER COLUMN client_id DROP NOT NULL;

-- Adicionar coluna para clientes vinculados
ALTER TABLE public.financial_plans 
ADD COLUMN linked_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Adicionar constraint CHECK para garantir que um dos dois está preenchido
ALTER TABLE public.financial_plans 
ADD CONSTRAINT financial_plans_client_check 
CHECK (client_id IS NOT NULL OR linked_user_id IS NOT NULL);

-- Atualizar RLS policies para incluir clientes vinculados
DROP POLICY IF EXISTS "assessor_manage_own_client_plans" ON public.financial_plans;
DROP POLICY IF EXISTS "client_view_own_plans" ON public.financial_plans;

CREATE POLICY "assessor_manage_own_client_plans"
ON public.financial_plans FOR ALL
USING (
  advisor_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM clients
    WHERE clients.id = financial_plans.client_id
    AND clients.advisor_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE client_advisor_links.client_id = financial_plans.linked_user_id
    AND client_advisor_links.advisor_id = auth.uid()
    AND client_advisor_links.status = 'active'
  )
);

CREATE POLICY "client_view_own_plans"
ON public.financial_plans FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM clients 
    WHERE clients.id = financial_plans.client_id 
    AND clients.user_id = auth.uid()
  ) OR
  linked_user_id = auth.uid()
);