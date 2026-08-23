import { useMemo } from 'react';
import { useSubscription } from './useSubscription';
import { PLAN_LIMITS, PlanType } from '@/config/plan-features';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlanLimitsResult {
  limits: typeof PLAN_LIMITS[PlanType];
  currentPlan: PlanType;
  assetsCount: number;
  goalsCount: number;
  aiQuestionsThisMonth: number;
  canAddAsset: () => boolean;
  canAddGoal: () => boolean;
  canAskAI: () => boolean;
  getRemainingAIQuestions: () => number;
  getRemainingAssets: () => number;
  getRemainingGoals: () => number;
  isFreePlan: boolean;
  isLoading: boolean;
}

export const usePlanLimits = (): PlanLimitsResult => {
  const { subscription, isLoading: subLoading } = useSubscription();

  const currentPlan = useMemo((): PlanType => {
    if (!subscription?.subscribed) return 'free';
    
    // If trial expired, return free
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      if (trialEnd < new Date()) {
        return 'free';
      }
      return 'trial';
    }
    
    // Return plan from subscription
    return (subscription.plan as PlanType) || 'free';
  }, [subscription]);

  const limits = PLAN_LIMITS[currentPlan];

  // Get assets count
  const { data: assetsCount = 0, isLoading: assetsLoading } = useQuery({
    queryKey: ['assets-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('client_id', null); // Contar apenas ativos pessoais
      
      return count || 0;
    },
    enabled: currentPlan === 'free',
  });

  // Get goals count
  const { data: goalsCount = 0, isLoading: goalsLoading } = useQuery({
    queryKey: ['goals-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count } = await supabase
        .from('financial_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      return count || 0;
    },
    enabled: currentPlan === 'free',
  });

  // For AI questions, we'd need a tracking table - for now return 0
  const aiQuestionsThisMonth = 0;

  const canAddAsset = () => {
    if (limits.maxAssets === Infinity) return true;
    return assetsCount < limits.maxAssets;
  };

  const canAddGoal = () => {
    if (limits.maxGoals === Infinity) return true;
    return goalsCount < limits.maxGoals;
  };

  const canAskAI = () => {
    if (limits.aiQuestionsPerMonth === Infinity) return true;
    return aiQuestionsThisMonth < limits.aiQuestionsPerMonth;
  };

  const getRemainingAIQuestions = () => {
    if (limits.aiQuestionsPerMonth === Infinity) return Infinity;
    return Math.max(0, limits.aiQuestionsPerMonth - aiQuestionsThisMonth);
  };

  const getRemainingAssets = () => {
    if (limits.maxAssets === Infinity) return Infinity;
    return Math.max(0, limits.maxAssets - assetsCount);
  };

  const getRemainingGoals = () => {
    if (limits.maxGoals === Infinity) return Infinity;
    return Math.max(0, limits.maxGoals - goalsCount);
  };

  return {
    limits,
    currentPlan,
    assetsCount,
    goalsCount,
    aiQuestionsThisMonth,
    canAddAsset,
    canAddGoal,
    canAskAI,
    getRemainingAIQuestions,
    getRemainingAssets,
    getRemainingGoals,
    isFreePlan: currentPlan === 'free',
    isLoading: subLoading || assetsLoading || goalsLoading,
  };
};
