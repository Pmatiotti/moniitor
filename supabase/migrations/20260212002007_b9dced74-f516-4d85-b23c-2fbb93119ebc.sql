
-- Function to auto-create alerts for variable income assets
CREATE OR REPLACE FUNCTION public.auto_create_variable_income_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for variable income asset classes
  IF NEW.asset_class IN ('Ações', 'FIIs', 'Renda Variável') THEN
    -- Create dividend alert if not exists
    INSERT INTO public.alerts (user_id, ticker, alert_type, is_active, frequency, comparison_type)
    SELECT NEW.user_id, NEW.ticker, 'dividend', true, 'daily', 'above'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE user_id = NEW.user_id AND ticker = NEW.ticker AND alert_type = 'dividend'
    );

    -- Create corporate event (fatos relevantes) alert if not exists
    INSERT INTO public.alerts (user_id, ticker, alert_type, is_active, frequency, comparison_type)
    SELECT NEW.user_id, NEW.ticker, 'corporate_event', true, 'daily', 'above'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.alerts 
      WHERE user_id = NEW.user_id AND ticker = NEW.ticker AND alert_type = 'corporate_event'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on assets table
DROP TRIGGER IF EXISTS trigger_auto_create_alerts ON public.assets;
CREATE TRIGGER trigger_auto_create_alerts
  AFTER INSERT ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_variable_income_alerts();
