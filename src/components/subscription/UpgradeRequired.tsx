import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, ArrowLeft, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFeatureAccess, FeatureKey } from '@/hooks/useFeatureAccess';
import { useSubscription } from '@/hooks/useSubscription';
import { FEATURE_INFO, PLAN_INFO, PLAN_FEATURES } from '@/config/plan-features';

interface UpgradeRequiredProps {
  feature: FeatureKey;
}

export const UpgradeRequired = ({ feature }: UpgradeRequiredProps) => {
  const { currentPlan, getRequiredPlan, isTrialExpired } = useFeatureAccess();
  const { createCheckoutSession } = useSubscription();
  const navigate = useNavigate();
  
  const requiredPlan = getRequiredPlan(feature);
  const featureInfo = FEATURE_INFO[feature];
  const planInfo = PLAN_INFO[requiredPlan];
  const planFeatures = PLAN_FEATURES[requiredPlan].slice(0, 8);

  const handleUpgrade = () => {
    if (planInfo.priceId) {
      createCheckoutSession.mutate(planInfo.priceId);
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8">
        <div className="text-center mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-2xl font-bold mb-2">
            Funcionalidade Premium
          </h1>
          
          {isTrialExpired ? (
            <p className="text-muted-foreground mb-4">
              Seu período de teste expirou. Faça upgrade para continuar usando{' '}
              <strong>{featureInfo?.name}</strong>.
            </p>
          ) : (
            <p className="text-muted-foreground mb-4">
              <strong>{featureInfo?.name}</strong> está disponível a partir do plano{' '}
              <Badge variant="secondary">{planInfo.name}</Badge>
            </p>
          )}

          <p className="text-sm text-muted-foreground">
            {featureInfo?.description}
          </p>
        </div>

        <Card className="p-4 border-primary bg-primary/5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <p className="font-semibold text-lg">Plano {planInfo.name}</p>
              </div>
              <p className="text-2xl font-bold text-primary mt-1">
                R$ {planInfo.price}
                <span className="text-sm font-normal text-muted-foreground">/mês</span>
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {planFeatures.map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary flex-shrink-0" />
                <span>{FEATURE_INFO[feat]?.name || feat}</span>
              </div>
            ))}
          </div>
        </Card>

        {currentPlan && !isTrialExpired && (
          <p className="text-sm text-center mb-6 text-muted-foreground">
            Seu plano atual: <Badge variant="outline">{PLAN_INFO[currentPlan]?.name || currentPlan}</Badge>
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button 
            onClick={handleUpgrade}
            className="flex-1 gap-2"
            disabled={createCheckoutSession.isPending}
          >
            {createCheckoutSession.isPending ? 'Processando...' : 'Fazer Upgrade Agora'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => navigate('/subscription')}
          >
            Ver Planos
          </Button>
        </div>
      </Card>
    </div>
  );
};
