
-- Fix FK constraints on authorized_organization_emails to allow user deletion
ALTER TABLE public.authorized_organization_emails
  DROP CONSTRAINT authorized_organization_emails_invited_by_fkey,
  ADD CONSTRAINT authorized_organization_emails_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.authorized_organization_emails
  DROP CONSTRAINT authorized_organization_emails_used_by_fkey,
  ADD CONSTRAINT authorized_organization_emails_used_by_fkey
    FOREIGN KEY (used_by) REFERENCES auth.users(id) ON DELETE SET NULL;
