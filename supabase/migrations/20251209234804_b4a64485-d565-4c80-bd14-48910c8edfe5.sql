-- Adicionar policy para assessores visualizarem assets de clientes vinculados via client_advisor_links
CREATE POLICY "Advisors can view linked user assets" 
ON public.assets 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links cal
    WHERE cal.client_id = assets.user_id 
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);