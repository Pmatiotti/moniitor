-- Add client_id to upcoming_dividends to support CRM portfolios
ALTER TABLE public.upcoming_dividends
ADD COLUMN IF NOT EXISTS client_id uuid;

-- Index for CRM lookups
CREATE INDEX IF NOT EXISTS idx_upcoming_dividends_client_id
ON public.upcoming_dividends (client_id);

-- Replace the existing unique constraint with two partial unique indexes
ALTER TABLE public.upcoming_dividends
DROP CONSTRAINT IF EXISTS upcoming_dividends_user_id_ticker_payment_date_dividend_typ_key;

CREATE UNIQUE INDEX IF NOT EXISTS upcoming_dividends_unique_personal
ON public.upcoming_dividends (user_id, ticker, payment_date, dividend_type)
WHERE client_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS upcoming_dividends_unique_client
ON public.upcoming_dividends (client_id, ticker, payment_date, dividend_type)
WHERE client_id IS NOT NULL;