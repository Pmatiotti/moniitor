import { ComponentType, useState, useEffect } from 'react';
import { useFeatureAccess, FeatureKey } from '@/hooks/useFeatureAccess';
import { UpgradeRequired } from './UpgradeRequired';
import { UpgradeDialog } from './UpgradeDialog';
import { Skeleton } from '@/components/ui/skeleton';

interface WithFeatureAccessOptions {
  showDialog?: boolean;
}

export const withFeatureAccess = <P extends object>(
  WrappedComponent: ComponentType<P>,
  feature: FeatureKey,
  options: WithFeatureAccessOptions = {}
) => {
  const { showDialog = true } = options;

  return function ProtectedComponent(props: P) {
    const { canAccess, isLoading } = useFeatureAccess();
    const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

    useEffect(() => {
      if (!isLoading && !canAccess(feature) && showDialog) {
        setShowUpgradeDialog(true);
      }
    }, [isLoading]);

    if (isLoading) {
      return (
        <div className="p-8 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (!canAccess(feature)) {
      return (
        <>
          <UpgradeRequired feature={feature} />
          {showDialog && (
            <UpgradeDialog 
              open={showUpgradeDialog} 
              onOpenChange={setShowUpgradeDialog}
              feature={feature}
            />
          )}
        </>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

// Alternative: Hook-based approach for more control
export const useRequireFeature = (feature: FeatureKey) => {
  const { canAccess, isLoading, getRequiredPlan } = useFeatureAccess();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);

  const hasAccess = canAccess(feature);
  const requiredPlan = getRequiredPlan(feature);

  const triggerUpgrade = () => {
    if (!hasAccess) {
      setShowUpgradeDialog(true);
    }
  };

  return {
    hasAccess,
    isLoading,
    requiredPlan,
    showUpgradeDialog,
    setShowUpgradeDialog,
    triggerUpgrade,
  };
};
