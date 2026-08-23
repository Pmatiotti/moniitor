import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { RebalancingSimulator } from "@/components/rebalancing/RebalancingSimulator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Scale, Target, TrendingUp, AlertTriangle, HelpCircle } from "lucide-react";

const Rebalancing = () => {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeenHowItWorks = localStorage.getItem('rebalancing-hide-how-it-works');
    if (!hasSeenHowItWorks) {
      setShowHowItWorks(true);
    }
  }, []);

  const handleCloseDialog = () => {
    if (dontShowAgain) {
      localStorage.setItem('rebalancing-hide-how-it-works', 'true');
    }
    setShowHowItWorks(false);
    setDontShowAgain(false);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Rebalanceamento</h1>
            <p className="text-muted-foreground">Simule e otimize a alocação da sua carteira</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowHowItWorks(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Como funciona
          </Button>
        </div>

        <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Como funciona o Rebalanceamento
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>1.</strong> Visualize sua alocação atual dividida por classe de ativo
              </p>
              <p>
                <strong>2.</strong> Defina sua alocação alvo ideal (total deve ser 100%)
              </p>
              <p>
                <strong>3.</strong> Clique em "Calcular Rebalanceamento" para ver as ações sugeridas
              </p>
              <p>
                <strong>4.</strong> Execute as compras/vendas recomendadas para otimizar sua carteira
              </p>
              <div className="flex items-center gap-2 pt-4 border-t">
                <Checkbox
                  id="dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                />
                <label
                  htmlFor="dont-show"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Não mostrar novamente
                </label>
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <Button onClick={handleCloseDialog}>Entendi</Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balanceamento</CardTitle>
              <Scale className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Mantenha sua carteira alinhada com seus objetivos
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Otimização</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Defina alocações alvo personalizadas por classe
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Gestão de Risco</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Evite concentração excessiva em um ativo
              </p>
            </CardContent>
          </Card>
        </div>

        <RebalancingSimulator />
      </div>
    </AppLayout>
  );
};

export default Rebalancing;
