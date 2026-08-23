-- Adicionar 'amortização' como tipo válido de provento
ALTER TABLE dividends 
DROP CONSTRAINT IF EXISTS dividends_dividend_type_check;

ALTER TABLE dividends 
ADD CONSTRAINT dividends_dividend_type_check 
CHECK (dividend_type IN ('dividendo', 'jcp', 'rendimento', 'amortização'));