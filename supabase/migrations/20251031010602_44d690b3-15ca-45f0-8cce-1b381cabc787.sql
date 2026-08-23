-- Add new columns to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS sub_class text,
ADD COLUMN IF NOT EXISTS application_date date,
ADD COLUMN IF NOT EXISTS maturity_date date,
ADD COLUMN IF NOT EXISTS rate text,
ADD COLUMN IF NOT EXISTS invested_amount numeric;

-- Add comments for documentation
COMMENT ON COLUMN public.assets.sub_class IS 'Subclasse do ativo. Ex: Para Renda Fixa: Pós-fixada, Inflação, Pré-fixada. Para Fundos: Renda Fixa, Ações, Multimercado';
COMMENT ON COLUMN public.assets.application_date IS 'Data de aplicação (principalmente para Renda Fixa)';
COMMENT ON COLUMN public.assets.maturity_date IS 'Data de vencimento (principalmente para Renda Fixa)';
COMMENT ON COLUMN public.assets.rate IS 'Taxa/Rendimento. Ex: CDI + 2%, IPCA + 6%, 12% a.a.';
COMMENT ON COLUMN public.assets.invested_amount IS 'Valor aplicado/investido inicialmente';