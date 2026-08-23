-- Add CASCADE to remaining tables

-- Subscriptions
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Target allocations
ALTER TABLE public.target_allocations DROP CONSTRAINT IF EXISTS target_allocations_user_id_fkey;
ALTER TABLE public.target_allocations ADD CONSTRAINT target_allocations_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- User achievements
ALTER TABLE public.user_achievements DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
ALTER TABLE public.user_achievements ADD CONSTRAINT user_achievements_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- User education progress
ALTER TABLE public.user_education_progress DROP CONSTRAINT IF EXISTS user_education_progress_user_id_fkey;
ALTER TABLE public.user_education_progress ADD CONSTRAINT user_education_progress_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tasks client_id
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_client_id_fkey;

-- Deal pipeline client_id - remove FK as it references clients table, not users
ALTER TABLE public.deal_pipeline DROP CONSTRAINT IF EXISTS deal_pipeline_client_id_fkey;

-- Interactions client_id - remove FK as it references clients table, not users
ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_client_id_fkey;

-- Meetings client_id - remove FK as it references clients table, not users  
ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_client_id_fkey;

-- Impersonation tokens
ALTER TABLE public.impersonation_tokens DROP CONSTRAINT IF EXISTS impersonation_tokens_admin_id_fkey;
ALTER TABLE public.impersonation_tokens DROP CONSTRAINT IF EXISTS impersonation_tokens_target_user_id_fkey;

ALTER TABLE public.impersonation_tokens ADD CONSTRAINT impersonation_tokens_admin_id_fkey 
FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.impersonation_tokens ADD CONSTRAINT impersonation_tokens_target_user_id_fkey 
FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;