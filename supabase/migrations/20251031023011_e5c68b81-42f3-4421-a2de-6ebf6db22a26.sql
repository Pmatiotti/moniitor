-- Criar tabela para armazenar dados históricos de benchmarks
CREATE TABLE IF NOT EXISTS public.benchmark_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  benchmark_type TEXT NOT NULL,
  date DATE NOT NULL,
  value NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(benchmark_type, date)
);

-- Criar índices para melhor performance
CREATE INDEX idx_benchmark_data_type_date ON public.benchmark_data(benchmark_type, date DESC);

-- Habilitar RLS
ALTER TABLE public.benchmark_data ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para todos usuários autenticados
CREATE POLICY "Anyone can read benchmark data"
  ON public.benchmark_data
  FOR SELECT
  USING (true);

-- Apenas service role pode inserir/atualizar
CREATE POLICY "Only service role can insert benchmark data"
  ON public.benchmark_data
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update benchmark data"
  ON public.benchmark_data
  FOR UPDATE
  USING (false);

-- Criar função para atualizar updated_at
CREATE TRIGGER update_benchmark_data_updated_at
  BEFORE UPDATE ON public.benchmark_data
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();