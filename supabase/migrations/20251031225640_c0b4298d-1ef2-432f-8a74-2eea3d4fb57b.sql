-- Add tour_completed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN tour_completed BOOLEAN DEFAULT false NOT NULL;