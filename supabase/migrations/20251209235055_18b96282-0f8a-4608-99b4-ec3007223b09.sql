-- Fase 2: RLS policy para assessores verem dividendos de clientes vinculados
CREATE POLICY "Advisors can view linked client dividends" 
ON public.dividends 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links cal
    WHERE cal.client_id = dividends.user_id 
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);

-- Fase 4: RLS policy para assessores verem metas de clientes vinculados via client_advisor_links
CREATE POLICY "Advisors can view linked client goals" 
ON public.financial_goals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links cal
    WHERE cal.client_id = financial_goals.user_id 
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);