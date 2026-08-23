-- Fix RLS policies to use is_service_role() function
DROP POLICY IF EXISTS "Service role can insert sync logs" ON public.sync_execution_logs;
DROP POLICY IF EXISTS "Service role can update sync logs" ON public.sync_execution_logs;

CREATE POLICY "Service role can insert sync logs"
  ON public.sync_execution_logs
  FOR INSERT
  WITH CHECK (public.is_service_role());

CREATE POLICY "Service role can update sync logs"
  ON public.sync_execution_logs
  FOR UPDATE
  USING (public.is_service_role());