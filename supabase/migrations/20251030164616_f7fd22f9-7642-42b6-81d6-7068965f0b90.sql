-- Fix missing SELECT policy on clients table
CREATE POLICY "Advisors can view own clients_select"
  ON public.clients
  FOR SELECT
  USING (auth.uid() = advisor_id);

-- Fix missing INSERT policy on notifications table
-- Only the system (via service role) should create notifications
-- For now, we'll allow insert only if user_id matches auth.uid()
CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);