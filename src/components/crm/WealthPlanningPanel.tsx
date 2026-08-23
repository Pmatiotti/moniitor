import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Shield, 
  Calculator, 
  Wallet,
  FileText,
  Users,
  Plus
} from "lucide-react";
import { RetirementPlanner } from "./planning/RetirementPlanner";
import { SuccessionPlanner } from "./planning/SuccessionPlanner";
import { TaxOptimizer } from "./planning/TaxOptimizer";
import { CashFlowProjection } from "./planning/CashFlowProjection";
import { RiskAnalysis } from "./planning/RiskAnalysis";
import { AddClientGoalDialog } from "./AddClientGoalDialog";
import { CreateFinancialPlanDialog } from "./CreateFinancialPlanDialog";
import { Client } from "@/pages/CRM";
import { PlanData } from "@/types/financial-plan";

interface WealthPlanningPanelProps {
  client: Client;
  onGoalCreated?: () => void;
}

export const WealthPlanningPanel = ({ client, onGoalCreated }: WealthPlanningPanelProps) => {
  const [activeTab, setActiveTab] = useState("retirement");
  const [addGoalOpen, setAddGoalOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [initialPlanData, setInitialPlanData] = useState<PlanData | null>(null);

  const handleSaveAsPlan = (data: PlanData) => {
    setInitialPlanData(data);
    setCreatePlanOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Planejamento Patrimonial</h3>
          <p className="text-muted-foreground">
            Análises avançadas e projeções personalizadas para {client.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreatePlanOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Criar Plano
          </Button>
          <Button onClick={() => setAddGoalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Meta
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">Aposentadoria</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {client.portfolio_value 
                ? `${((Number(client.portfolio_value) / 1000000) * 100).toFixed(0)}%`
                : "0%"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              do patrimônio alvo
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Shield className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-muted-foreground">Proteção</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Médio</div>
            <p className="text-xs text-muted-foreground mt-1">
              nível de cobertura
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Wallet className="h-5 w-5 text-green-600" />
              <span className="text-xs text-muted-foreground">Eficiência</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">78%</div>
            <p className="text-xs text-muted-foreground mt-1">
              otimização fiscal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Planning Tools */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="retirement" className="text-xs">
            <TrendingUp className="h-4 w-4 mr-2" />
            Aposentadoria
          </TabsTrigger>
          <TabsTrigger value="succession" className="text-xs">
            <Users className="h-4 w-4 mr-2" />
            Sucessão
          </TabsTrigger>
          <TabsTrigger value="tax" className="text-xs">
            <Calculator className="h-4 w-4 mr-2" />
            Fiscal
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs">
            <FileText className="h-4 w-4 mr-2" />
            Fluxo Caixa
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">
            <Shield className="h-4 w-4 mr-2" />
            Riscos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="retirement">
          <RetirementPlanner client={client} onSaveAsPlan={handleSaveAsPlan} />
        </TabsContent>

        <TabsContent value="succession">
          <SuccessionPlanner client={client} onSaveAsPlan={handleSaveAsPlan} />
        </TabsContent>

        <TabsContent value="tax">
          <TaxOptimizer client={client} onSaveAsPlan={handleSaveAsPlan} />
        </TabsContent>

        <TabsContent value="cashflow">
          <CashFlowProjection client={client} onSaveAsPlan={handleSaveAsPlan} />
        </TabsContent>

        <TabsContent value="risk">
          <RiskAnalysis client={client} onSaveAsPlan={handleSaveAsPlan} />
        </TabsContent>
      </Tabs>

      <AddClientGoalDialog
        open={addGoalOpen}
        onOpenChange={setAddGoalOpen}
        onSuccess={() => {
          onGoalCreated?.();
        }}
        client={client}
      />

      <CreateFinancialPlanDialog
        clientId={client.id}
        open={createPlanOpen}
        onOpenChange={(open) => {
          setCreatePlanOpen(open);
          if (!open) setInitialPlanData(null);
        }}
        onSuccess={() => {
          setInitialPlanData(null);
        }}
        initialData={initialPlanData}
      />
    </div>
  );
};
