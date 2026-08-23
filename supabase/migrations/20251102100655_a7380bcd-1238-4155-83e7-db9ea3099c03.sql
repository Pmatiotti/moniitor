-- Fix clients table RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Advisors can view linked clients" ON public.clients;
DROP POLICY IF EXISTS "Advisors can update linked clients" ON public.clients;
DROP POLICY IF EXISTS "Advisors can delete linked clients" ON public.clients;

-- Create correct policies for advisors to manage their own clients
CREATE POLICY "Advisors can view own clients"
  ON public.clients
  FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own clients"
  ON public.clients
  FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own clients"
  ON public.clients
  FOR DELETE
  USING (auth.uid() = advisor_id);