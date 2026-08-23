import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeatureAccess, FeatureKey } from '@/hooks/useFeatureAccess';
import { FEATURE_INFO, PLAN_INFO } from '@/config/plan-features';

interface FeatureGateProps {
  feature: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgrade?: boolean;
  inline?: boolean;
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  showUpgrade = true,
  inline = false
}: FeatureGateProps) => {
  const { canAccess, getRequiredPlan, isLoading } = useFeatureAccess();
  const navigate = useNavigate();

  if (isLoading) {
    return <Skeleton className={inline ? "h-8 w-24" : "h-32 w-full"} />;
  }

  if (canAccess(feature)) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredPlan = getRequiredPlan(feature);
  const featureInfo = FEATURE_INFO[feature];
  const planInfo = PLAN_INFO[requiredPlan];

  // Inline blocked state
  if (inline) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="h-4 w-4" />
        <span className="text-sm">Disponível no plano {planInfo.name}</span>
        {showUpgrade && (
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0"
            onClick={() => navigate('/subscription')}
          >
            Fazer upgrade
          </Button>
        )}
      </div>
    );
  }

  // Default blocked state with blurred preview
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-background/98 via-background/80 to-background/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-center">
          {featureInfo?.name || 'Funcionalidade Premium'}
        </h3>
        <p className="text-sm text-muted-foreground text-center mb-4 max-w-sm">
          {featureInfo?.description}
        </p>
        <Badge variant="outline" className="mb-4">
          <Sparkles className="h-3 w-3 mr-1" />
          Disponível no plano {planInfo.name}
        </Badge>
        {showUpgrade && (
          <Button onClick={() => navigate('/subscription')}>
            Fazer Upgrade
          </Button>
        )}
      </div>
      <div className="filter blur-sm pointer-events-none select-none opacity-50">
        {children}
      </div>
    </Card>
  );
};
