-- Criar tabela para armazenar alocações alvo dos usuários
CREATE TABLE public.target_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_class TEXT NOT NULL,
  target_percentage NUMERIC NOT NULL CHECK (target_percentage >= 0 AND target_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, asset_class)
);

-- Habilitar RLS
ALTER TABLE public.target_allocations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own target allocations"
  ON public.target_allocations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own target allocations"
  ON public.target_allocations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own target allocations"
  ON public.target_allocations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own target allocations"
  ON public.target_allocations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_target_allocations_updated_at
  BEFORE UPDATE ON public.target_allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();