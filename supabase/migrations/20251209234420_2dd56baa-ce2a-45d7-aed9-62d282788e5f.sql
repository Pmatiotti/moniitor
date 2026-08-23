-- Adicionar policy para assessores visualizarem profiles de clientes vinculados
CREATE POLICY "Advisors can view linked client profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links cal
    WHERE cal.client_id = profiles.id 
    AND cal.advisor_id = auth.uid()
    AND cal.status = 'active'
  )
);