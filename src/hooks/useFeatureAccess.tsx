import { useMemo, useCallback } from 'react';
import { useSubscription } from './useSubscription';
import { useUserRoles } from './useUserRole';
import { 
  PLAN_FEATURES, 
  FeatureKey, 
  FEATURE_INFO, 
  PlanType,
  getPlanFromProductId,
  PLAN_INFO
} from '@/config/plan-features';

export interface FeatureAccessResult {
  currentPlan: PlanType | null;
  isLoading: boolean;
  isTrialExpired: boolean;
  isPrivilegedRole: boolean;
  canAccess: (feature: FeatureKey) => boolean;
  getRequiredPlan: (feature: FeatureKey) => PlanType;
  getBlockedFeatures: () => FeatureKey[];
  getFeatureInfo: (feature: FeatureKey) => typeof FEATURE_INFO[FeatureKey];
  subscription: ReturnType<typeof useSubscription>['subscription'];
}

export const useFeatureAccess = (): FeatureAccessResult => {
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();
  const { data: roles, isLoading: isLoadingRoles } = useUserRoles();

  // Check if user has privileged role (admin, gestor, assessor)
  const isPrivilegedRole = useMemo(() => {
    if (!roles) return false;
    return roles.some(role => ['admin', 'gestor', 'assessor'].includes(role));
  }, [roles]);

  const isLoading = isLoadingSubscription || isLoadingRoles;

  const currentPlan = useMemo((): PlanType | null => {
    // Privileged roles get full access (professional plan)
    if (isPrivilegedRole) return 'professional';
    
    if (!subscription?.subscribed) return 'free';
    
    // Check if trial expired
    if (subscription.status === 'trialing' && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      if (trialEnd < new Date()) {
        return 'free';
      }
      return 'trial';
    }
    
    // If we have a product_id, use it to determine the plan
    if (subscription.product_id) {
      const planFromProduct = getPlanFromProductId(subscription.product_id);
      if (planFromProduct) return planFromProduct;
    }
    
    // Fallback to plan field if available
    if (subscription.plan) {
      return subscription.plan as PlanType;
    }
    
    // Active subscription without product_id = assume paid
    if (subscription.status === 'active') {
      return 'investor';
    }
    
    return 'free';
  }, [subscription, isPrivilegedRole]);

  const isTrialExpired = useMemo((): boolean => {
    if (!subscription) return false;
    if (subscription.status !== 'trialing') return false;
    if (!subscription.trial_end) return false;
    
    return new Date(subscription.trial_end) < new Date();
  }, [subscription]);

  const canAccess = useCallback((feature: FeatureKey): boolean => {
    // Privileged roles have full access to all features
    if (isPrivilegedRole) return true;
    
    // Free plan has limited access
    if (!currentPlan) return false;
    
    // Trial expired = free plan access
    if (isTrialExpired) {
      return PLAN_FEATURES['free']?.includes(feature) ?? false;
    }
    
    // Subscription expired or canceled = free plan
    if (subscription?.status === 'canceled' || subscription?.status === 'expired') {
      return PLAN_FEATURES['free']?.includes(feature) ?? false;
    }
    
    // Check if plan has access to feature
    return PLAN_FEATURES[currentPlan]?.includes(feature) ?? false;
  }, [subscription, currentPlan, isTrialExpired, isPrivilegedRole]);

  const getRequiredPlan = useCallback((feature: FeatureKey): PlanType => {
    return FEATURE_INFO[feature]?.requiredPlan || 'pro';
  }, []);

  const getBlockedFeatures = useCallback((): FeatureKey[] => {
    if (!currentPlan) {
      return Object.keys(FEATURE_INFO) as FeatureKey[];
    }
    
    const allFeatures = Object.keys(FEATURE_INFO) as FeatureKey[];
    return allFeatures.filter(f => !PLAN_FEATURES[currentPlan].includes(f));
  }, [currentPlan]);

  const getFeatureInfo = useCallback((feature: FeatureKey) => {
    return FEATURE_INFO[feature];
  }, []);

  return {
    currentPlan,
    isLoading,
    isTrialExpired,
    isPrivilegedRole,
    canAccess,
    getRequiredPlan,
    getBlockedFeatures,
    getFeatureInfo,
    subscription,
  };
};

// Export types for external use
export type { FeatureKey, PlanType };
