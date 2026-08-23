-- Fix remaining RLS policies that use WITH CHECK (true)

-- 1. Fix audit_logs INSERT policy - restrict to service_role only
-- Audit logs should only be inserted by backend functions, not client code
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "Service role can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- 2. Fix email_logs INSERT policy - restrict to service_role only  
-- Email logs should only be inserted by backend functions
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
CREATE POLICY "Service role can insert email logs" 
ON public.email_logs 
FOR INSERT 
TO service_role 
WITH CHECK (true);

-- 3. Fix organizations INSERT policy - require authenticated user
-- This is acceptable as the organization doesn't have a direct user_id
-- But we can make it slightly more restrictive by checking auth.uid() is not null
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() IS NOT NULL);