-- Create sync execution logs table for monitoring synchronizations
CREATE TABLE public.sync_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  status text DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  records_processed integer DEFAULT 0,
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_execution_logs ENABLE ROW LEVEL SECURITY;

-- Create policies: admins can read all logs
CREATE POLICY "Admins can view sync logs"
  ON public.sync_execution_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert/update
CREATE POLICY "Service role can insert sync logs"
  ON public.sync_execution_logs
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update sync logs"
  ON public.sync_execution_logs
  FOR UPDATE
  USING (true);

-- Create index for faster queries
CREATE INDEX idx_sync_logs_function_name ON public.sync_execution_logs(function_name);
CREATE INDEX idx_sync_logs_started_at ON public.sync_execution_logs(started_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_execution_logs(status);