import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, FileDown, AlertCircle, Calendar, Info } from "lucide-react";
import { PerformanceChart } from "@/components/performance/PerformanceChart";
import { RiskMetrics } from "@/components/performance/RiskMetrics";
import { SectorAllocation } from "@/components/performance/SectorAllocation";
import { generatePerformanceReport } from "@/lib/pdf-reports";
import { useToast } from "@/hooks/use-toast";
import { usePortfolioMetrics } from "@/hooks/usePortfolioMetrics";
import { evaluateSharpeRatio, evaluateVolatility } from "@/lib/performance-calculations";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type PeriodType = 'month' | '3m' | '6m' | '12m' | 'year' | 'all';

const Performance = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('12m');
  const { metrics, snapshots, hasEnoughData, loading, sinceInceptionReturn, twr, refreshData, reconstructHistory } = usePortfolioMetrics(selectedPeriod);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };


  const handleGeneratePDF = async () => {
    try {
      if (!metrics) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.email || 'Usuário';
      
      // Buscar valores atuais do portfólio
      const lastSnapshot = snapshots[snapshots.length - 1];
      
      const reportMetrics = {
        totalValue: lastSnapshot?.total_value || 0,
        totalInvested: lastSnapshot?.total_invested || 0,
        totalProfit: (lastSnapshot?.total_value || 0) - (lastSnapshot?.total_invested || 0),
        totalReturn: metrics.totalReturn,
        annualReturn: metrics.annualizedReturn,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
        maxDrawdown: metrics.maxDrawdown,
      };
      
      generatePerformanceReport(reportMetrics, userName);
      
      toast({
        title: "Relatório gerado",
        description: "O relatório de performance foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const sharpeEval = metrics ? evaluateSharpeRatio(metrics.sharpeRatio) : null;
  const volEval = metrics ? evaluateVolatility(metrics.volatility) : null;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Performance</h1>
            <p className="text-muted-foreground">
              Análise detalhada de risco, retorno e alocação do portfólio
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodType)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="3m">3 meses</SelectItem>
                <SelectItem value="6m">6 meses</SelectItem>
                <SelectItem value="12m">12 meses</SelectItem>
                <SelectItem value="year">Ano atual</SelectItem>
                <SelectItem value="all">Todo histórico</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleGeneratePDF} variant="outline" disabled={!hasEnoughData}>
              <FileDown className="mr-2 h-4 w-4" />
              Gerar PDF
            </Button>
          </div>
        </div>

        {/* Data Status Banner */}
        {!hasEnoughData && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="flex items-center gap-4 py-4">
              <AlertCircle className="h-8 w-8 text-warning" />
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Dados históricos insuficientes</h3>
                <p className="text-sm text-muted-foreground">
                  Você tem apenas {snapshots.length} snapshot(s). Crie snapshots diários para ter métricas precisas de volatilidade, Sharpe e drawdown.
                </p>
              </div>
              <Button onClick={async () => {
                const success = await reconstructHistory();
                if (success) await refreshData();
              }}>
                Reconstruir Histórico
              </Button>
            </CardContent>
          </Card>
        )}

        {hasEnoughData && twr !== null && (
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <TrendingUp className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Rentabilidade</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">TWR</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-medium mb-1">Time-Weighted Return</p>
                          <p className="text-sm">Mede a qualidade das suas escolhas de investimento, eliminando o efeito de aportes e retiradas. É o padrão GIPS usado por gestores profissionais.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className={`text-4xl font-bold ${twr >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {twr >= 0 ? '+' : ''}{twr.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

{hasEnoughData && metrics && (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Calendar className="h-4 w-4" />
    <span>
      Dados de {format(new Date(metrics.startDate), "dd/MM/yyyy", { locale: ptBR })} a{" "}
      {format(new Date(metrics.endDate), "dd/MM/yyyy", { locale: ptBR })} ({metrics.daysAnalyzed} dias)
    </span>
  </div>
)}

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retorno Total</CardTitle>
              {metrics && metrics.totalReturn >= 0 ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics ? formatPercent(metrics.totalReturn) : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {hasEnoughData ? 'No período selecionado' : 'Sem dados suficientes'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retorno Anualizado</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics && metrics.daysAnalyzed >= 30 
                  ? formatPercent(metrics.annualizedReturn) 
                  : '—'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics && metrics.daysAnalyzed >= 30 
                  ? 'Projetado para 12 meses' 
                  : `Período muito curto (${metrics?.daysAnalyzed || 0} dias)`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Volatilidade</CardTitle>
              <BarChart3 className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics ? `${metrics.volatility.toFixed(1)}%` : '—'}
              </div>
              <p className={`text-xs mt-1 ${volEval?.color || 'text-muted-foreground'}`}>
                {volEval?.level || 'Desvio padrão anual'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Índice Sharpe</CardTitle>
              <Target className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics ? metrics.sharpeRatio.toFixed(2) : '—'}
              </div>
              <p className={`text-xs mt-1 ${sharpeEval?.color || 'text-muted-foreground'}`}>
                {sharpeEval?.rating || 'Retorno ajustado ao risco'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different analysis views */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance">Desempenho</TabsTrigger>
            <TabsTrigger value="risk">Risco</TabsTrigger>
            <TabsTrigger value="allocation">Alocação</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução do Portfólio</CardTitle>
                <CardDescription>
                  {hasEnoughData 
                    ? 'Baseado em snapshots diários reais do seu portfólio'
                    : 'Crie snapshots diários para ver a evolução real'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PerformanceChart snapshots={snapshots} period={selectedPeriod} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risk" className="space-y-6">
            <RiskMetrics 
              volatility={metrics?.volatility || 0}
              sharpeRatio={metrics?.sharpeRatio || 0}
              maxDrawdown={metrics?.maxDrawdown || 0}
              sortino={metrics?.sortino || 0}
              calmarRatio={metrics?.calmarRatio || 0}
              hasData={hasEnoughData}
            />
          </TabsContent>

          <TabsContent value="allocation" className="space-y-6">
            <SectorAllocation />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Performance;
