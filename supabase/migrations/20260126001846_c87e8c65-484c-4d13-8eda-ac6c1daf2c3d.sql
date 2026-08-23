-- Adicionar colunas para suporte a instituições financeiras
-- annual_fundamentals
ALTER TABLE annual_fundamentals ADD COLUMN IF NOT EXISTS is_financial BOOLEAN DEFAULT false;
ALTER TABLE annual_fundamentals ADD COLUMN IF NOT EXISTS financial_type TEXT;
ALTER TABLE annual_fundamentals ADD COLUMN IF NOT EXISTS data_source TEXT;
ALTER TABLE annual_fundamentals ADD COLUMN IF NOT EXISTS format_flags JSONB;

-- fundamental_data
ALTER TABLE fundamental_data ADD COLUMN IF NOT EXISTS is_financial BOOLEAN DEFAULT false;
ALTER TABLE fundamental_data ADD COLUMN IF NOT EXISTS financial_type TEXT;
ALTER TABLE fundamental_data ADD COLUMN IF NOT EXISTS format_flags JSONB;

-- Índice para facilitar queries de financeiros
CREATE INDEX IF NOT EXISTS idx_annual_fundamentals_is_financial ON annual_fundamentals(is_financial) WHERE is_financial = true;
CREATE INDEX IF NOT EXISTS idx_fundamental_data_is_financial ON fundamental_data(is_financial) WHERE is_financial = true;