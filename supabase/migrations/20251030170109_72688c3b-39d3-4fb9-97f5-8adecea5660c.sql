-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the check-alerts function to run every hour
SELECT cron.schedule(
  'check-alerts-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url:='https://xlmvqhjwliamckyxlpfi.supabase.co/functions/v1/check-alerts',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsbXZxaGp3bGlhbWNreXhscGZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4MzU0NjgsImV4cCI6MjA3NzQxMTQ2OH0.7-0OKzJ0QRL7Aihe3jqd8wOWMlkY0pmylB_wsNZhXFk"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);