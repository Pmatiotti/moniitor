-- Permitir que assessores vejam dados Pluggy dos seus clientes

-- Política para pluggy_items
CREATE POLICY "Advisors can view client pluggy items"
ON public.pluggy_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    WHERE cal.client_id = pluggy_items.user_id
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);

-- Política para pluggy_accounts
CREATE POLICY "Advisors can view client pluggy accounts"
ON public.pluggy_accounts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    WHERE cal.client_id = pluggy_accounts.user_id
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);

-- Política para pluggy_credit_cards
CREATE POLICY "Advisors can view client credit cards"
ON public.pluggy_credit_cards
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    WHERE cal.client_id = pluggy_credit_cards.user_id
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);

-- Política para pluggy_investment_portfolios
CREATE POLICY "Advisors can view client investment portfolios"
ON public.pluggy_investment_portfolios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    WHERE cal.client_id = pluggy_investment_portfolios.user_id
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);

-- Política para pluggy_investments
CREATE POLICY "Advisors can view client investments"
ON public.pluggy_investments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    WHERE cal.client_id = pluggy_investments.user_id
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);

-- Política para transactions (se assessores precisarem ver transações)
CREATE POLICY "Advisors can view client transactions"
ON public.transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links cal
    WHERE cal.client_id = transactions.user_id
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);

COMMENT ON POLICY "Advisors can view client pluggy items" ON public.pluggy_items IS 
'Permite que assessores visualizem as conexões Pluggy dos seus clientes linkados';

COMMENT ON POLICY "Advisors can view client pluggy accounts" ON public.pluggy_accounts IS 
'Permite que assessores visualizem as contas bancárias dos seus clientes via Pluggy';

COMMENT ON POLICY "Advisors can view client credit cards" ON public.pluggy_credit_cards IS 
'Permite que assessores visualizem os cartões de crédito dos seus clientes via Pluggy';

COMMENT ON POLICY "Advisors can view client investment portfolios" ON public.pluggy_investment_portfolios IS 
'Permite que assessores visualizem os portfólios de investimento dos seus clientes via Pluggy';

COMMENT ON POLICY "Advisors can view client investments" ON public.pluggy_investments IS 
'Permite que assessores visualizem os investimentos individuais dos seus clientes via Pluggy';

COMMENT ON POLICY "Advisors can view client transactions" ON public.transactions IS 
'Permite que assessores visualizem as transações financeiras dos seus clientes';