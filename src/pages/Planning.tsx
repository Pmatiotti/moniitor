import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CompoundInterestCalculator } from "@/components/planning/CompoundInterestCalculator";
import { TimeToGoalCalculator } from "@/components/planning/TimeToGoalCalculator";
import { MonthlyContributionCalculator } from "@/components/planning/MonthlyContributionCalculator";
import { ScenarioSimulator } from "@/components/planning/ScenarioSimulator";
import { AdvisorPlans } from "@/components/planning/AdvisorPlans";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calculator, TrendingUp, Target, Lightbulb, HelpCircle, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Planning = () => {
  const [showTips, setShowTips] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeenTips = localStorage.getItem('planning-hide-tips');
    if (!hasSeenTips) {
      setShowTips(true);
    }
  }, []);

  const handleCloseDialog = () => {
    if (dontShowAgain) {
      localStorage.setItem('planning-hide-tips', 'true');
    }
    setShowTips(false);
    setDontShowAgain(false);
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Planejamento Financeiro</h1>
            <p className="text-muted-foreground">Calculadoras e simuladores para suas decisões de investimento</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTips(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Dicas de uso
          </Button>
        </div>

        <Dialog open={showTips} onOpenChange={setShowTips}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Dicas de Uso
              </DialogTitle>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground mb-2">Juros Compostos</p>
                <p>Use para descobrir quanto seu patrimônio pode crescer com investimentos regulares.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">Tempo para Meta</p>
                <p>Planeje quanto tempo precisará para atingir seus objetivos financeiros.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">Aporte Necessário</p>
                <p>Calcule exatamente quanto precisa investir mensalmente para alcançar sua meta.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-2">Simulador de Cenários</p>
                <p>Visualize o impacto de diferentes taxas de retorno no seu patrimônio futuro.</p>
              </div>
              <div className="col-span-2 flex items-center gap-2 pt-4 border-t">
                <Checkbox
                  id="dont-show-tips"
                  checked={dontShowAgain}
                  onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
                />
                <label
                  htmlFor="dont-show-tips"
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

        <div className="grid gap-6 md:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Juros Compostos</CardTitle>
              <Calculator className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Calcule o poder dos juros sobre juros
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tempo para Meta</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Descubra quanto tempo levará
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aporte Necessário</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Calcule quanto investir mensalmente
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Cenários</CardTitle>
              <Lightbulb className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Compare diferentes estratégias
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="compound" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="compound">Juros Compostos</TabsTrigger>
            <TabsTrigger value="time">Tempo</TabsTrigger>
            <TabsTrigger value="contribution">Aporte</TabsTrigger>
            <TabsTrigger value="scenarios">Cenários</TabsTrigger>
            <TabsTrigger value="plans">Planos do Assessor</TabsTrigger>
          </TabsList>

          <TabsContent value="compound">
            <CompoundInterestCalculator />
          </TabsContent>

          <TabsContent value="time">
            <TimeToGoalCalculator />
          </TabsContent>

          <TabsContent value="contribution">
            <MonthlyContributionCalculator />
          </TabsContent>

          <TabsContent value="scenarios">
            <ScenarioSimulator />
          </TabsContent>

          <TabsContent value="plans">
            <AdvisorPlans />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Planning;
