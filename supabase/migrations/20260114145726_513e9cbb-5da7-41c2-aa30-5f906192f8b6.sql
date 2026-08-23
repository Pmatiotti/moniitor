-- Tabela de feriados brasileiros para cálculo de dias úteis
CREATE TABLE public.brazilian_holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date DATE NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.brazilian_holidays ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (feriados são públicos)
CREATE POLICY "Anyone can read holidays" 
ON public.brazilian_holidays 
FOR SELECT 
USING (true);

-- Inserir feriados 2024-2026
INSERT INTO public.brazilian_holidays (holiday_date, description) VALUES
  -- 2024
  ('2024-01-01', 'Confraternização Universal'),
  ('2024-02-12', 'Carnaval'),
  ('2024-02-13', 'Carnaval'),
  ('2024-03-29', 'Sexta-feira Santa'),
  ('2024-04-21', 'Tiradentes'),
  ('2024-05-01', 'Dia do Trabalho'),
  ('2024-05-30', 'Corpus Christi'),
  ('2024-09-07', 'Independência'),
  ('2024-10-12', 'Nossa Senhora Aparecida'),
  ('2024-11-02', 'Finados'),
  ('2024-11-15', 'Proclamação da República'),
  ('2024-11-20', 'Consciência Negra'),
  ('2024-12-25', 'Natal'),
  -- 2025
  ('2025-01-01', 'Confraternização Universal'),
  ('2025-03-03', 'Carnaval'),
  ('2025-03-04', 'Carnaval'),
  ('2025-04-18', 'Sexta-feira Santa'),
  ('2025-04-21', 'Tiradentes'),
  ('2025-05-01', 'Dia do Trabalho'),
  ('2025-06-19', 'Corpus Christi'),
  ('2025-09-07', 'Independência'),
  ('2025-10-12', 'Nossa Senhora Aparecida'),
  ('2025-11-02', 'Finados'),
  ('2025-11-15', 'Proclamação da República'),
  ('2025-11-20', 'Consciência Negra'),
  ('2025-12-25', 'Natal'),
  -- 2026
  ('2026-01-01', 'Confraternização Universal'),
  ('2026-02-16', 'Carnaval'),
  ('2026-02-17', 'Carnaval'),
  ('2026-04-03', 'Sexta-feira Santa'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalho'),
  ('2026-06-04', 'Corpus Christi'),
  ('2026-09-07', 'Independência'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Consciência Negra'),
  ('2026-12-25', 'Natal');

-- Tabela de indicadores econômicos (CDI, SELIC, IPCA)
CREATE TABLE public.economic_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_type TEXT NOT NULL,
  reference_date DATE NOT NULL,
  daily_rate NUMERIC(12,10),
  monthly_rate NUMERIC(8,6),
  annual_rate NUMERIC(8,4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(indicator_type, reference_date)
);

-- Índices para performance
CREATE INDEX idx_economic_indicators_type_date ON public.economic_indicators(indicator_type, reference_date DESC);

-- Habilitar RLS
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Anyone can read economic indicators" 
ON public.economic_indicators 
FOR SELECT 
USING (true);

-- Função para contar dias úteis entre duas datas
CREATE OR REPLACE FUNCTION public.count_business_days(start_date DATE, end_date DATE)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_days INTEGER := 0;
  current_dt DATE := start_date;
BEGIN
  -- Se data início > data fim, retornar 0
  IF start_date > end_date THEN
    RETURN 0;
  END IF;
  
  WHILE current_dt <= end_date LOOP
    -- Verificar se não é fim de semana (0=domingo, 6=sábado)
    IF EXTRACT(DOW FROM current_dt) NOT IN (0, 6) THEN
      -- Verificar se não é feriado
      IF NOT EXISTS (SELECT 1 FROM public.brazilian_holidays WHERE holiday_date = current_dt) THEN
        total_days := total_days + 1;
      END IF;
    END IF;
    current_dt := current_dt + INTERVAL '1 day';
  END LOOP;
  
  RETURN total_days;
END;
$$;

-- Função para obter lista de dias úteis entre duas datas
CREATE OR REPLACE FUNCTION public.get_business_days(start_date DATE, end_date DATE)
RETURNS TABLE(business_date DATE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_dt DATE := start_date;
BEGIN
  IF start_date > end_date THEN
    RETURN;
  END IF;
  
  WHILE current_dt <= end_date LOOP
    IF EXTRACT(DOW FROM current_dt) NOT IN (0, 6) THEN
      IF NOT EXISTS (SELECT 1 FROM public.brazilian_holidays WHERE holiday_date = current_dt) THEN
        business_date := current_dt;
        RETURN NEXT;
      END IF;
    END IF;
    current_dt := current_dt + INTERVAL '1 day';
  END LOOP;
  
  RETURN;
END;
$$;