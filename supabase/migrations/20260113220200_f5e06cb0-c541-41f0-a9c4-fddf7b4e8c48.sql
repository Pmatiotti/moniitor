-- Create table for custom asset sub-classes
CREATE TABLE public.custom_asset_subclasses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_class TEXT NOT NULL,
  sub_class_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, asset_class, sub_class_name)
);

-- Enable Row Level Security
ALTER TABLE public.custom_asset_subclasses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own custom subclasses" 
ON public.custom_asset_subclasses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own custom subclasses" 
ON public.custom_asset_subclasses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom subclasses" 
ON public.custom_asset_subclasses 
FOR DELETE 
USING (auth.uid() = user_id);