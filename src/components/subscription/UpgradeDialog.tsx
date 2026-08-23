import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Check, ArrowRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { useFeatureAccess, FeatureKey, PlanType } from '@/hooks/useFeatureAccess';
import { FEATURE_INFO, PLAN_INFO, PLAN_FEATURES } from '@/config/plan-features';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: FeatureKey;
}

export const UpgradeDialog = ({ open, onOpenChange, feature }: UpgradeDialogProps) => {
  const navigate = useNavigate();
  const { getRequiredPlan, currentPlan } = useFeatureAccess();
  const { createCheckoutSession } = useSubscription();
  
  const requiredPlan = getRequiredPlan(feature);
  const featureInfo = FEATURE_INFO[feature];
  const planInfo = PLAN_INFO[requiredPlan];

  const handleUpgrade = async () => {
    if (planInfo.priceId) {
      createCheckoutSession.mutate(planInfo.priceId);
    }
    onOpenChange(false);
  };

  const handleViewPlans = () => {
    navigate('/subscription');
    onOpenChange(false);
  };

  // Get features included in the required plan
  const planFeatures = PLAN_FEATURES[requiredPlan].slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Upgrade Necessário
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {featureInfo?.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {featureInfo?.description}
            </p>
          </div>

          <Card className="p-4 border-primary bg-primary/5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-lg">Plano {planInfo.name}</p>
                <p className="text-2xl font-bold text-primary">
                  R$ {planInfo.price}
                  <span className="text-sm font-normal text-muted-foreground">/mês</span>
                </p>
              </div>
              <Badge variant="default" className="bg-primary">
                Recomendado
              </Badge>
            </div>
            
            <div className="space-y-2 mt-4">
              {planFeatures.map((feat) => (
                <div key={feat} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{FEATURE_INFO[feat]?.name || feat}</span>
                </div>
              ))}
              {PLAN_FEATURES[requiredPlan].length > 6 && (
                <p className="text-sm text-muted-foreground pl-6">
                  + mais {PLAN_FEATURES[requiredPlan].length - 6} funcionalidades
                </p>
              )}
            </div>
          </Card>

          {currentPlan && (
            <p className="text-sm text-center text-muted-foreground">
              Seu plano atual: <Badge variant="outline">{PLAN_INFO[currentPlan]?.name || currentPlan}</Badge>
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleViewPlans}
            className="w-full sm:w-auto"
          >
            Ver todos os planos
          </Button>
          <Button 
            onClick={handleUpgrade}
            className="w-full sm:w-auto gap-2"
            disabled={createCheckoutSession.isPending}
          >
            {createCheckoutSession.isPending ? (
              'Processando...'
            ) : (
              <>
                Fazer Upgrade
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
