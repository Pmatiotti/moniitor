-- Add ON DELETE CASCADE to all user_id foreign keys

-- Drop and recreate user_roles constraint with CASCADE
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add CASCADE to profiles table
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Add CASCADE to specific tables one by one
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_user_id_fkey;
ALTER TABLE public.assets ADD CONSTRAINT assets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.budgets DROP CONSTRAINT IF EXISTS budgets_user_id_fkey;
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE public.categories ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.dividends DROP CONSTRAINT IF EXISTS dividends_user_id_fkey;
ALTER TABLE public.dividends ADD CONSTRAINT dividends_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.financial_goals DROP CONSTRAINT IF EXISTS financial_goals_user_id_fkey;
ALTER TABLE public.financial_goals ADD CONSTRAINT financial_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.goal_portfolio_mappings DROP CONSTRAINT IF EXISTS goal_portfolio_mappings_user_id_fkey;
ALTER TABLE public.goal_portfolio_mappings ADD CONSTRAINT goal_portfolio_mappings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.goal_progress_history DROP CONSTRAINT IF EXISTS goal_progress_history_user_id_fkey;
ALTER TABLE public.goal_progress_history ADD CONSTRAINT goal_progress_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add CASCADE to advisor_id and client_id in various tables
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_advisor_id_fkey;
ALTER TABLE public.clients ADD CONSTRAINT clients_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.client_advisor_links DROP CONSTRAINT IF EXISTS client_advisor_links_advisor_id_fkey;
ALTER TABLE public.client_advisor_links ADD CONSTRAINT client_advisor_links_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.client_advisor_links DROP CONSTRAINT IF EXISTS client_advisor_links_client_id_fkey;
ALTER TABLE public.client_advisor_links ADD CONSTRAINT client_advisor_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.client_portfolio_snapshots DROP CONSTRAINT IF EXISTS client_portfolio_snapshots_advisor_id_fkey;
ALTER TABLE public.client_portfolio_snapshots ADD CONSTRAINT client_portfolio_snapshots_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.deal_pipeline DROP CONSTRAINT IF EXISTS deal_pipeline_advisor_id_fkey;
ALTER TABLE public.deal_pipeline ADD CONSTRAINT deal_pipeline_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.interactions DROP CONSTRAINT IF EXISTS interactions_advisor_id_fkey;
ALTER TABLE public.interactions ADD CONSTRAINT interactions_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.meetings DROP CONSTRAINT IF EXISTS meetings_advisor_id_fkey;
ALTER TABLE public.meetings ADD CONSTRAINT meetings_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tasks table
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_advisor_id_fkey;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_advisor_id_fkey FOREIGN KEY (advisor_id) REFERENCES auth.users(id) ON DELETE CASCADE;