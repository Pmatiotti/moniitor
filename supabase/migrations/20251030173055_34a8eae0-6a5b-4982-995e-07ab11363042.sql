-- Create interactions table for client communication history
CREATE TABLE public.interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  interaction_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  interaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table for follow-ups and to-dos
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deal_pipeline table for sales opportunities
CREATE TABLE public.deal_pipeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  advisor_id UUID NOT NULL,
  deal_name TEXT NOT NULL,
  deal_value NUMERIC,
  stage TEXT NOT NULL DEFAULT 'prospecting',
  probability INTEGER DEFAULT 0,
  expected_close_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_pipeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interactions
CREATE POLICY "Advisors can view own interactions"
  ON public.interactions FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can create own interactions"
  ON public.interactions FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own interactions"
  ON public.interactions FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own interactions"
  ON public.interactions FOR DELETE
  USING (auth.uid() = advisor_id);

-- RLS Policies for tasks
CREATE POLICY "Advisors can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can create own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = advisor_id);

-- RLS Policies for deal_pipeline
CREATE POLICY "Advisors can view own deals"
  ON public.deal_pipeline FOR SELECT
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can create own deals"
  ON public.deal_pipeline FOR INSERT
  WITH CHECK (auth.uid() = advisor_id);

CREATE POLICY "Advisors can update own deals"
  ON public.deal_pipeline FOR UPDATE
  USING (auth.uid() = advisor_id);

CREATE POLICY "Advisors can delete own deals"
  ON public.deal_pipeline FOR DELETE
  USING (auth.uid() = advisor_id);

-- Create indexes for better performance
CREATE INDEX idx_interactions_client ON public.interactions(client_id);
CREATE INDEX idx_interactions_advisor ON public.interactions(advisor_id);
CREATE INDEX idx_tasks_advisor ON public.tasks(advisor_id);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_deal_pipeline_advisor ON public.deal_pipeline(advisor_id);
CREATE INDEX idx_deal_pipeline_stage ON public.deal_pipeline(stage);

-- Create trigger for updating tasks updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for updating deal_pipeline updated_at
CREATE TRIGGER update_deal_pipeline_updated_at
  BEFORE UPDATE ON public.deal_pipeline
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();