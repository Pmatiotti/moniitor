-- Fix profiles table RLS policies
-- Issue: Some policies are accessible to 'public' (unauthenticated) role instead of 'authenticated'

-- Drop the problematic public policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Advisors can view linked client profiles" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation on signup" ON profiles;

-- Recreate policies with proper authenticated role
-- 1. Allow profile creation on signup (needs public for signup, but only own profile)
CREATE POLICY "Allow profile creation on signup" 
ON profiles FOR INSERT 
TO authenticated
WITH CHECK (id = auth.uid());

-- 2. Users can update own profile (authenticated only)
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Users can view profiles in their organization (authenticated only)
CREATE POLICY "Users can view profiles in their organization" 
ON profiles FOR SELECT 
TO authenticated
USING (organization_id = get_user_organization(auth.uid()));

-- 4. Advisors can view linked client profiles (authenticated only)
CREATE POLICY "Advisors can view linked client profiles" 
ON profiles FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM client_advisor_links cal
    WHERE cal.client_id = profiles.id 
    AND cal.advisor_id = auth.uid() 
    AND cal.status = 'active'
  )
);