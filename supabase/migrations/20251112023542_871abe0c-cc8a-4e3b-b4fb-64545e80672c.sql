-- Update RLS policies for financial_goals to support advisor-client relationship

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own goals" ON financial_goals;
DROP POLICY IF EXISTS "Users can create own goals" ON financial_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON financial_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON financial_goals;

-- Allow users to view their own goals
CREATE POLICY "Users can view own goals"
ON financial_goals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow clients to view goals created by their advisors
CREATE POLICY "Clients can view goals created by advisors"
ON financial_goals
FOR SELECT
TO authenticated
USING (
  auth.uid() = client_id
  OR (
    client_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM client_advisor_links
      WHERE client_id = auth.uid()
      AND advisor_id = financial_goals.user_id
      AND status = 'active'
    )
  )
);

-- Allow advisors to view goals of their clients
CREATE POLICY "Advisors can view client goals"
ON financial_goals
FOR SELECT
TO authenticated
USING (
  client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE advisor_id = auth.uid()
    AND client_id = financial_goals.client_id
    AND status = 'active'
  )
);

-- Allow users to create their own goals
CREATE POLICY "Users can create own goals"
ON financial_goals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow advisors to create goals for their clients
CREATE POLICY "Advisors can create goals for clients"
ON financial_goals
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE advisor_id = auth.uid()
    AND client_id = financial_goals.client_id
    AND status = 'active'
  )
);

-- Allow users to update their own goals
CREATE POLICY "Users can update own goals"
ON financial_goals
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Allow advisors to update goals they created for clients
CREATE POLICY "Advisors can update client goals"
ON financial_goals
FOR UPDATE
TO authenticated
USING (
  client_id IS NOT NULL
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE advisor_id = auth.uid()
    AND client_id = financial_goals.client_id
    AND status = 'active'
  )
);

-- Allow users to delete their own goals
CREATE POLICY "Users can delete own goals"
ON financial_goals
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow advisors to delete goals they created for clients
CREATE POLICY "Advisors can delete client goals"
ON financial_goals
FOR DELETE
TO authenticated
USING (
  client_id IS NOT NULL
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM client_advisor_links
    WHERE advisor_id = auth.uid()
    AND client_id = financial_goals.client_id
    AND status = 'active'
  )
);