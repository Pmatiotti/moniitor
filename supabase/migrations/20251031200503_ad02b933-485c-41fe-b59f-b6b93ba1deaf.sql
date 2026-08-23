-- Fix 1: Improve clients table RLS to check client_advisor_links for proper access control
-- This prevents compromised advisor accounts from accessing all client PII

-- Drop existing advisor-related policies on clients table
DROP POLICY IF EXISTS "Advisors can view own clients_select" ON public.clients;
DROP POLICY IF EXISTS "Advisors can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Advisors can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Advisors can delete own clients" ON public.clients;

-- Create improved policies that check client_advisor_links
CREATE POLICY "Advisors can view linked clients"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_id = clients.id
    AND advisor_id = auth.uid()
    AND status = 'active'
  )
);

CREATE POLICY "Advisors can insert own clients"
ON public.clients
FOR INSERT
WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update linked clients"
ON public.clients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_id = clients.id
    AND advisor_id = auth.uid()
    AND status = 'active'
  )
);

CREATE POLICY "Advisors can delete linked clients"
ON public.clients
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.client_advisor_links
    WHERE client_id = clients.id
    AND advisor_id = auth.uid()
    AND status = 'active'
  )
);

-- Fix 2: Clean up impersonation_tokens RLS policy
-- Remove confusing policy and rely on service role access only
DROP POLICY IF EXISTS "Service role can manage impersonation tokens" ON public.impersonation_tokens;

-- Keep RLS enabled but no policies = default deny for non-service roles
-- Service role bypasses RLS by default
ALTER TABLE public.impersonation_tokens ENABLE ROW LEVEL SECURITY;