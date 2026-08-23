-- Add whatsapp notification preference to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_notifications_enabled boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.profiles.whatsapp_notifications_enabled IS 'Whether user wants to receive WhatsApp notifications for alerts';