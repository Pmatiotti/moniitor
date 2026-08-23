-- Adicionar coluna user_id na tabela clients para vincular com usuários autenticados
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Atualizar políticas RLS de financial_plans para considerar user_id
DROP POLICY IF EXISTS "cliente_view_own_plans" ON public.financial_plans;

CREATE POLICY "cliente_view_own_plans"
ON public.financial_plans
FOR SELECT
TO public
USING (
  -- Cliente pode ver planos onde ele é o cliente (via user_id)
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = financial_plans.client_id
    AND clients.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "cliente_update_reviewed_date" ON public.financial_plans;

CREATE POLICY "cliente_update_reviewed_date"
ON public.financial_plans
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.id = financial_plans.client_id
    AND clients.user_id = auth.uid()
  )
)
WITH CHECK (reviewed_by_client_at IS NOT NULL);