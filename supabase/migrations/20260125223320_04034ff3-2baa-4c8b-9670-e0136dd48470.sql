-- Corrigir escala de percentuais em annual_fundamentals
-- Todos os campos percentuais do robô CVM vêm em formato decimal (0.xx)
UPDATE annual_fundamentals
SET 
  roe = CASE WHEN roe IS NOT NULL THEN roe * 100 ELSE roe END,
  roa = CASE WHEN roa IS NOT NULL THEN roa * 100 ELSE roa END,
  roic = CASE WHEN roic IS NOT NULL THEN roic * 100 ELSE roic END,
  gross_margin = CASE WHEN gross_margin IS NOT NULL THEN gross_margin * 100 ELSE gross_margin END,
  ebitda_margin = CASE WHEN ebitda_margin IS NOT NULL THEN ebitda_margin * 100 ELSE ebitda_margin END,
  ebit_margin = CASE WHEN ebit_margin IS NOT NULL THEN ebit_margin * 100 ELSE ebit_margin END,
  net_margin = CASE WHEN net_margin IS NOT NULL THEN net_margin * 100 ELSE net_margin END,
  dividend_yield = CASE WHEN dividend_yield IS NOT NULL THEN dividend_yield * 100 ELSE dividend_yield END,
  payout_ratio = CASE WHEN payout_ratio IS NOT NULL THEN payout_ratio * 100 ELSE payout_ratio END,
  cagr_receitas_5a = CASE WHEN cagr_receitas_5a IS NOT NULL THEN cagr_receitas_5a * 100 ELSE cagr_receitas_5a END,
  cagr_lucros_5a = CASE WHEN cagr_lucros_5a IS NOT NULL THEN cagr_lucros_5a * 100 ELSE cagr_lucros_5a END
WHERE updated_at > NOW() - INTERVAL '48 hours';

-- Corrigir escala de percentuais em fundamental_data
UPDATE fundamental_data
SET 
  roe = CASE WHEN roe IS NOT NULL THEN roe * 100 ELSE roe END,
  roa = CASE WHEN roa IS NOT NULL THEN roa * 100 ELSE roa END,
  roic = CASE WHEN roic IS NOT NULL THEN roic * 100 ELSE roic END,
  m_bruta = CASE WHEN m_bruta IS NOT NULL THEN m_bruta * 100 ELSE m_bruta END,
  m_ebitda = CASE WHEN m_ebitda IS NOT NULL THEN m_ebitda * 100 ELSE m_ebitda END,
  m_liquida = CASE WHEN m_liquida IS NOT NULL THEN m_liquida * 100 ELSE m_liquida END,
  dividend_yield = CASE WHEN dividend_yield IS NOT NULL THEN dividend_yield * 100 ELSE dividend_yield END,
  payout_ratio = CASE WHEN payout_ratio IS NOT NULL THEN payout_ratio * 100 ELSE payout_ratio END,
  cagr_receitas_5 = CASE WHEN cagr_receitas_5 IS NOT NULL THEN cagr_receitas_5 * 100 ELSE cagr_receitas_5 END,
  cagr_lucros_5 = CASE WHEN cagr_lucros_5 IS NOT NULL THEN cagr_lucros_5 * 100 ELSE cagr_lucros_5 END
WHERE data_source = 'cvm_dfp_bot'
  AND updated_at > NOW() - INTERVAL '48 hours';