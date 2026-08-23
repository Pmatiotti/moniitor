-- Fix function search_path for update_email_template_updated_at
CREATE OR REPLACE FUNCTION public.update_email_template_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;