
-- Enable the pg_net extension for HTTP requests from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to call the send-welcome-email edge function
CREATE OR REPLACE FUNCTION public.trigger_send_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Only send if welcome_email_sent is false or null
  IF NEW.welcome_email_sent IS NOT TRUE THEN
    -- Get Supabase URL from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    service_role_key := current_setting('app.settings.service_role_key', true);
    
    -- If settings not available, use direct URL
    IF supabase_url IS NULL THEN
      supabase_url := 'https://xlmvqhjwliamckyxlpfi.supabase.co';
    END IF;
    
    -- Call the edge function using pg_net
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/send-welcome-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(service_role_key, current_setting('supabase.service_role_key', true))
      ),
      body := jsonb_build_object(
        'userName', COALESCE(NEW.full_name, 'Usuário'),
        'userEmail', NEW.email
      )
    );
    
    -- Mark welcome email as sent
    NEW.welcome_email_sent := true;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_created_send_welcome ON public.profiles;

CREATE TRIGGER on_profile_created_send_welcome
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_welcome_email();
