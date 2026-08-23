-- Criar tabela de emails autorizados por organização
CREATE TABLE IF NOT EXISTS public.authorized_organization_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'assessor',
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  used_at timestamp with time zone,
  used_by uuid REFERENCES auth.users(id),
  UNIQUE(organization_id, email)
);

-- Index para performance
CREATE INDEX idx_authorized_emails_org ON public.authorized_organization_emails(organization_id);
CREATE INDEX idx_authorized_emails_email ON public.authorized_organization_emails(email);

-- RLS policies
ALTER TABLE public.authorized_organization_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage authorized emails"
ON public.authorized_organization_emails
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can check if their email is authorized"
ON public.authorized_organization_emails
FOR SELECT
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Adicionar campos úteis na tabela organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS cnpj text,
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS contact_phone text,
ADD COLUMN IF NOT EXISTS address text;