-- Create table to link clients with advisors
CREATE TABLE public.client_advisor_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  UNIQUE(client_id, advisor_id)
);

-- Enable RLS
ALTER TABLE public.client_advisor_links ENABLE ROW LEVEL SECURITY;

-- Policies for client_advisor_links
-- Clients can view their own advisor links
CREATE POLICY "Clients can view own advisor links"
ON public.client_advisor_links
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

-- Clients can create their own advisor links
CREATE POLICY "Clients can create own advisor links"
ON public.client_advisor_links
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id);

-- Clients can delete their own advisor links
CREATE POLICY "Clients can delete own advisor links"
ON public.client_advisor_links
FOR DELETE
TO authenticated
USING (auth.uid() = client_id);

-- Advisors can view links where they are the advisor
CREATE POLICY "Advisors can view their client links"
ON public.client_advisor_links
FOR SELECT
TO authenticated
USING (auth.uid() = advisor_id);

-- Admins can view all advisor links
CREATE POLICY "Admins can view all advisor links"
ON public.client_advisor_links
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all advisor links
CREATE POLICY "Admins can manage all advisor links"
ON public.client_advisor_links
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_client_advisor_links_updated_at
BEFORE UPDATE ON public.client_advisor_links
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();