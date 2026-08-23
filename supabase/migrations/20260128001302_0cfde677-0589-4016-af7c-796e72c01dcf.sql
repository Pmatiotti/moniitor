-- Adicionar coluna client_id na tabela dividends para consistência com CRM
ALTER TABLE public.dividends 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Índice para performance em queries filtradas por client_id
CREATE INDEX IF NOT EXISTS idx_dividends_client_id ON public.dividends(client_id);