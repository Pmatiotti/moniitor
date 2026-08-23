-- Add cron job for fetching FII announced dividends
-- Runs at 08:00 UTC (05:00 BRT) to capture morning announcements
SELECT cron.schedule(
  'fetch-fii-announced-dividends-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xlmvqhjwliamckyxlpfi.supabase.co/functions/v1/fetch-fii-announced-dividends',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Also run at 14:00 UTC (11:00 BRT) for afternoon announcements
SELECT cron.schedule(
  'fetch-fii-announced-dividends-afternoon',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xlmvqhjwliamckyxlpfi.supabase.co/functions/v1/fetch-fii-announced-dividends',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('supabase.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);