-- Adicionar campos da BRAPI Full para FIIs e ações na tabela fundamental_data
ALTER TABLE public.fundamental_data 
ADD COLUMN IF NOT EXISTS liquidez_media_diaria NUMERIC,
ADD COLUMN IF NOT EXISTS ultimo_rendimento NUMERIC,
ADD COLUMN IF NOT EXISTS patrimonio_liquido NUMERIC,
ADD COLUMN IF NOT EXISTS valor_patrimonial NUMERIC,
ADD COLUMN IF NOT EXISTS rentabilidade_mes NUMERIC,
ADD COLUMN IF NOT EXISTS data_ultimo_dividendo TEXT,
ADD COLUMN IF NOT EXISTS ultimo_dividendo NUMERIC;

-- Adicionar campos para indicadores de ações
ALTER TABLE public.fundamental_data
ADD COLUMN IF NOT EXISTS dy NUMERIC,
ADD COLUMN IF NOT EXISTS p_l NUMERIC,
ADD COLUMN IF NOT EXISTS peg_ratio NUMERIC,
ADD COLUMN IF NOT EXISTS ev_ebitda NUMERIC,
ADD COLUMN IF NOT EXISTS p_ebitda NUMERIC,
ADD COLUMN IF NOT EXISTS p_ebit NUMERIC,
ADD COLUMN IF NOT EXISTS vpa NUMERIC,
ADD COLUMN IF NOT EXISTS p_ativo NUMERIC,
ADD COLUMN IF NOT EXISTS p_cap_giro NUMERIC,
ADD COLUMN IF NOT EXISTS p_ativo_circ_liq NUMERIC,
ADD COLUMN IF NOT EXISTS div_liquida_pl NUMERIC,
ADD COLUMN IF NOT EXISTS div_liquida_ebitda NUMERIC,
ADD COLUMN IF NOT EXISTS div_liquida_ebit NUMERIC,
ADD COLUMN IF NOT EXISTS pl_ativo NUMERIC,
ADD COLUMN IF NOT EXISTS passivo_ativo NUMERIC,
ADD COLUMN IF NOT EXISTS liq_corrente NUMERIC,
ADD COLUMN IF NOT EXISTS m_bruta NUMERIC,
ADD COLUMN IF NOT EXISTS m_ebitda NUMERIC,
ADD COLUMN IF NOT EXISTS m_ebit NUMERIC,
ADD COLUMN IF NOT EXISTS m_liquida NUMERIC,
ADD COLUMN IF NOT EXISTS roe_percent NUMERIC,
ADD COLUMN IF NOT EXISTS roa_percent NUMERIC,
ADD COLUMN IF NOT EXISTS roic NUMERIC,
ADD COLUMN IF NOT EXISTS giro_ativos NUMERIC,
ADD COLUMN IF NOT EXISTS cagr_receitas_5 NUMERIC,
ADD COLUMN IF NOT EXISTS cagr_lucros_5 NUMERIC;

COMMENT ON COLUMN public.fundamental_data.liquidez_media_diaria IS 'Liquidez Média Diária (FIIs)';
COMMENT ON COLUMN public.fundamental_data.ultimo_rendimento IS 'Último Rendimento pago (FIIs)';
COMMENT ON COLUMN public.fundamental_data.patrimonio_liquido IS 'Patrimônio Líquido total';
COMMENT ON COLUMN public.fundamental_data.valor_patrimonial IS 'Valor Patrimonial por cota (FIIs)';
COMMENT ON COLUMN public.fundamental_data.rentabilidade_mes IS 'Rentabilidade no mês (%)';
COMMENT ON COLUMN public.fundamental_data.dy IS 'Dividend Yield (%)';
COMMENT ON COLUMN public.fundamental_data.p_l IS 'Preço/Lucro';
COMMENT ON COLUMN public.fundamental_data.ev_ebitda IS 'EV/EBITDA';
COMMENT ON COLUMN public.fundamental_data.div_liquida_pl IS 'Dívida Líquida/Patrimônio Líquido';
COMMENT ON COLUMN public.fundamental_data.cagr_receitas_5 IS 'CAGR Receitas 5 anos';