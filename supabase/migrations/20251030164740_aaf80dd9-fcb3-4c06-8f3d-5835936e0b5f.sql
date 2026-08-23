-- Drop the ALL policy on clients that might be too permissive
DROP POLICY IF EXISTS "Advisors can manage own clients" ON public.clients;

-- Drop the redundant policy on fundamental_data
DROP POLICY IF EXISTS "Fundamental data is publicly readable" ON public.fundamental_data;

-- Recreate specific policies for clients
CREATE POLICY "Advisors can insert own clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own clients"
  ON public.clients
  FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own clients"
  ON public.clients
  FOR DELETE
  USING (auth.uid() = advisor_id);