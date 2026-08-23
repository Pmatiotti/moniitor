import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, Wallet, Target } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { GoalsOverviewCard } from "@/components/dashboard/GoalsOverviewCard";
import { FixedIncomeRatesCard } from "@/components/dashboard/FixedIncomeRatesCard";
import { BrokerDistributionCard } from "@/components/dashboard/BrokerDistributionCard";
import { DividendsOverviewCard } from "@/components/dashboard/DividendsOverviewCard";
import { AIQuickAction } from "@/components/ai/AIQuickAction";
import { getAssetColor } from "@/lib/asset-colors";
import { PluggyConnectionsSummary } from "@/components/finances/PluggyConnectionsSummary";
import { PluggyFinancialSummary } from "@/components/finances/PluggyFinancialSummary";
import { PerformanceWidget } from "@/components/dashboard/PerformanceWidget";
import { OnboardingChecklist } from "@/components/onboarding/OnboardingChecklist";
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { PatrimonyOverviewCard } from "@/components/dashboard/PatrimonyOverviewCard";
import { UpcomingDividendsWidget } from "@/components/dashboard/UpcomingDividendsWidget";
import { EmailVerificationBanner } from "@/components/auth/EmailVerificationBanner";
import { MarketTickerBar } from "@/components/dashboard/MarketTickerBar";

interface PortfolioStats {
  totalValue: number;
  totalInvested: number;
  profitLoss: number;
  profitLossPercent: number;
  brlValue: number;
  usdValue: number;
}

interface AssetAllocation {
  name: string;
  value: number;
}

interface SubClassAllocation {
  name: string;
  value: number;
  parentClass: string;
}

interface CurrencyAllocation {
  name: string;
  value: number;
  percentage: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<PortfolioStats>({
    totalValue: 0,
    totalInvested: 0,
    profitLoss: 0,
    profitLossPercent: 0,
    brlValue: 0,
    usdValue: 0,
  });
  const [allocation, setAllocation] = useState<AssetAllocation[]>([]);
  const [subClassAllocation, setSubClassAllocation] = useState<SubClassAllocation[]>([]);
  const [currencyAllocation, setCurrencyAllocation] = useState<CurrencyAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [userName, setUserName] = useState<string>("");
  const [isEmpty, setIsEmpty] = useState(false);
  const [emailVerified, setEmailVerified] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserId(user.id);
      setUserEmail(user.email || "");

      // Check profile and onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, full_name, email_verified')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        setUserName(profile.full_name.split(' ')[0]);
      }

      // Check email verification status
      setEmailVerified(profile?.email_verified ?? true);

      // Buscar cotação do dólar
      let usdBrlRate = 5.0; // Valor padrão de fallback
      try {
        const { data: rateData, error: rateError } = await supabase.functions.invoke('fetch-market-data', {
          body: { ticker: 'USDBRL=X' }
        });
        
        if (!rateError && rateData?.success && rateData?.data?.current_price) {
          usdBrlRate = rateData.data.current_price;
        }
      } catch (error) {
        console.error("Error fetching USD/BRL rate:", error);
      }

      const { data: assets } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null); // Excluir ativos de clientes

      // Check if portfolio is empty
      const hasAssets = assets && assets.length > 0;
      
      // Check other data sources to determine if truly empty
      const { count: patrimonyCount } = await supabase
        .from('patrimony_assets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const { count: goalsCount } = await supabase
        .from('financial_goals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      const isCompletelyEmpty = !hasAssets && (patrimonyCount ?? 0) === 0 && (goalsCount ?? 0) === 0;
      setIsEmpty(isCompletelyEmpty);
      
      // Show onboarding if not completed and data is empty
      if (!profile?.onboarding_completed && isCompletelyEmpty) {
        setShowOnboarding(true);
      }

      if (hasAssets) {
        // Calcular valores considerando a lógica de fundos/RF vs ações/FIIs
        let totalInvestedBRL = 0;
        let totalValueBRL = 0;
        let brlValue = 0;
        let usdValue = 0;
        
        const allocationByClass: AssetAllocation[] = [];
        const allocationBySubClass: SubClassAllocation[] = [];

        assets.forEach((asset) => {
          // Verificar se usa invested_amount (Renda Fixa, Fundos de Investimento e Previdência)
          const usesInvestedAmount = (
            asset.asset_class === "Renda Fixa" || 
            asset.asset_class === "Fundos de Investimento" || 
            asset.asset_class === "Previdência"
          ) && asset.invested_amount && Number(asset.invested_amount) > 0;
          
          // Agora current_price sempre é preço unitário, multiplicar por quantidade
          const assetValue = Number(asset.current_price || asset.average_price) * Number(asset.quantity);
          
          const assetCost = usesInvestedAmount 
            ? Number(asset.invested_amount) 
            : Number(asset.average_price) * Number(asset.quantity);

          // Converter valores em USD para BRL
          const assetValueInBRL = asset.currency === 'USD' ? assetValue * usdBrlRate : assetValue;
          const assetCostInBRL = asset.currency === 'USD' ? assetCost * usdBrlRate : assetCost;

          totalInvestedBRL += assetCostInBRL;
          totalValueBRL += assetValueInBRL;

          // Distribuição por moeda (valores originais para o gráfico de região)
          if (asset.currency === 'BRL') {
            brlValue += assetValue;
          } else if (asset.currency === 'USD') {
            usdValue += assetValue;
          }

          // Alocação por classe (valores em BRL)
          const existing = allocationByClass.find(a => a.name === asset.asset_class);
          if (existing) {
            existing.value += assetValueInBRL;
          } else {
            allocationByClass.push({ name: asset.asset_class, value: assetValueInBRL });
          }

          // Alocação por subclasse (valores em BRL)
          if (asset.sub_class) {
            const existingSubClass = allocationBySubClass.find(a => a.name === asset.sub_class);
            if (existingSubClass) {
              existingSubClass.value += assetValueInBRL;
            } else {
              allocationBySubClass.push({ 
                name: asset.sub_class, 
                value: assetValueInBRL,
                parentClass: asset.asset_class
              });
            }
          }
        });

        const profitLoss = totalValueBRL - totalInvestedBRL;
        const profitLossPercent = totalInvestedBRL > 0 ? (profitLoss / totalInvestedBRL) * 100 : 0;

        setStats({
          totalValue: totalValueBRL,
          totalInvested: totalInvestedBRL,
          profitLoss,
          profitLossPercent,
          brlValue,
          usdValue: usdValue * usdBrlRate, // Converter USD para BRL no display
        });

        // Currency allocation (manter USD em dólar)
        const currencyData: CurrencyAllocation[] = [
          { name: 'Brasil (BRL)', value: brlValue, percentage: totalValueBRL > 0 ? (brlValue / totalValueBRL) * 100 : 0 },
          { name: 'Exterior (USD)', value: usdValue, percentage: totalValueBRL > 0 ? ((usdValue * usdBrlRate) / totalValueBRL) * 100 : 0 },
        ].filter(item => item.value > 0);
        
        setCurrencyAllocation(currencyData);
        setAllocation(allocationByClass);
        setSubClassAllocation(allocationBySubClass);
      }
    } catch (error) {
      console.error("Error fetching portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCurrencyByType = (value: number, currencyType: string) => {
    if (currencyType.includes('USD')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value);
    }
    return formatCurrency(value);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando dados...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Market Ticker Bar - uses negative margin to escape main padding */}
      <div className="-mx-8 -mt-8 mb-6">
        <MarketTickerBar />
      </div>

      {/* Main content - isolated from ticker */}
      <div className="space-y-8 w-full min-w-0">
        {/* Email Verification Banner */}
        {!emailVerified && userId && userEmail && (
          <EmailVerificationBanner 
            userId={userId} 
            email={userEmail}
            onDismiss={() => setEmailVerified(true)}
          />
        )}

        {/* Header com gradiente sutil */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do seu patrimônio</p>
        </div>

        {/* Onboarding Checklist for new users */}
        {showOnboarding && (
          <OnboardingChecklist 
            userName={userName}
            onComplete={() => setShowOnboarding(false)}
          />
        )}

        {/* Empty State for completely empty dashboard */}
        {isEmpty && !showOnboarding && (
          <DashboardEmptyState />
        )}

        {/* Stats Cards com hover e animação escalonada - only show when not empty */}
        {!isEmpty && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 min-w-0">
          <Card className="group hover-lift animate-fade-in" style={{ animationDelay: '0ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Patrimônio Total</CardTitle>
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.totalValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Valor de mercado</p>
            </CardContent>
          </Card>

          <Card className="group hover-lift animate-fade-in" style={{ animationDelay: '50ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Investido</CardTitle>
              <div className="p-2 rounded-lg bg-secondary group-hover:bg-secondary/80 transition-colors">
                <Target className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{formatCurrency(stats.totalInvested)}</div>
              <p className="text-xs text-muted-foreground mt-1">Custo médio</p>
            </CardContent>
          </Card>

          <Card className="group hover-lift animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Lucro/Prejuízo</CardTitle>
              <div className={`p-2 rounded-lg transition-colors ${stats.profitLoss >= 0 ? 'bg-green-500/10 group-hover:bg-green-500/15' : 'bg-red-500/10 group-hover:bg-red-500/15'}`}>
                <TrendingUp className={`h-4 w-4 ${stats.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tracking-tight ${stats.profitLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.profitLoss >= 0 ? '+' : ''}{formatCurrency(stats.profitLoss)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Resultado absoluto</p>
            </CardContent>
          </Card>

          <Card className="group hover-lift animate-fade-in" style={{ animationDelay: '150ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Rentabilidade</CardTitle>
              <div className={`p-2 rounded-lg transition-colors ${stats.profitLossPercent >= 0 ? 'bg-green-500/10 group-hover:bg-green-500/15' : 'bg-red-500/10 group-hover:bg-red-500/15'}`}>
                <DollarSign className={`h-4 w-4 ${stats.profitLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold tracking-tight ${stats.profitLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {stats.profitLossPercent >= 0 ? '+' : ''}{stats.profitLossPercent.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Retorno percentual</p>
            </CardContent>
          </Card>

          <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <PluggyConnectionsSummary />
          </div>
        </div>
        )}

        {!isEmpty && <PluggyFinancialSummary />}

        {!isEmpty && (
          <>
            {/* Widget row com animação */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <PerformanceWidget />
          <FixedIncomeRatesCard />
          <DividendsOverviewCard />
          <UpcomingDividendsWidget />
        </div>

        {/* Charts row */}
        <div className="grid gap-4 md:grid-cols-2 animate-fade-in" style={{ animationDelay: '300ms' }}>
          {currencyAllocation.length > 0 && (
            <Card className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Distribuição por Região</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={currencyAllocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage.toFixed(1)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {currencyAllocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getAssetColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => formatCurrencyByType(value, name)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {allocation.length > 0 && (
            <Card className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Alocação por Classe de Ativo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${((entry.value / stats.totalValue) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {allocation.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getAssetColor(entry.name)} fillOpacity={0.85} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px'
                      }}
                      labelStyle={{
                        color: 'hsl(var(--foreground))',
                        fontWeight: 600,
                        marginBottom: '4px'
                      }}
                      itemStyle={{
                        color: 'hsl(var(--muted-foreground))',
                        padding: '4px 0'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{
                        paddingTop: '16px',
                        fontSize: '14px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {subClassAllocation.length > 0 && (
          <Card className="hover-lift animate-fade-in" style={{ animationDelay: '350ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Distribuição por Subclasse de Ativo</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Gráfico de Pizza */}
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={subClassAllocation}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        stroke="hsl(var(--background))"
                        strokeWidth={3}
                      >
                        {subClassAllocation.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getAssetColor(entry.name)} fillOpacity={0.85} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label: string) => {
                          const item = subClassAllocation.find(s => s.name === label);
                          return item ? `${item.name} (${item.parentClass})` : label;
                        }}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.75rem',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          padding: '12px'
                        }}
                        labelStyle={{
                          color: 'hsl(var(--foreground))',
                          fontWeight: 600,
                          marginBottom: '4px'
                        }}
                        itemStyle={{
                          color: 'hsl(var(--muted-foreground))',
                          padding: '4px 0'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legenda organizada em lista */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground mb-4">Detalhamento</h4>
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-2">
                    {subClassAllocation
                      .sort((a, b) => b.value - a.value)
                      .map((item, index) => {
                        const percentage = ((item.value / stats.totalValue) * 100).toFixed(1);
                        return (
                          <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div 
                              className="w-4 h-4 rounded-sm flex-shrink-0" 
                              style={{ backgroundColor: getAssetColor(item.name) }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.parentClass}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-semibold">{percentage}%</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(item.value)}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Patrimony Overview */}
        <PatrimonyOverviewCard />

        <div className="grid gap-6 md:grid-cols-1">
          <GoalsOverviewCard />
        </div>

        <BrokerDistributionCard />

        {/* Quick AI Insights */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Insights Rápidos com IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <AIQuickAction
                label="Analisar Diversificação"
                prompt="Analise a diversificação da minha carteira e sugira melhorias específicas"
                contextData={{ stats, allocation }}
                variant="outline"
              />
              <AIQuickAction
                label="Identificar Riscos"
                prompt="Identifique os principais riscos da minha carteira atual e sugira como mitigá-los"
                contextData={{ stats, allocation }}
                variant="outline"
              />
              <AIQuickAction
                label="Sugerir Ações"
                prompt="Com base no meu portfolio atual, sugira 3 ações concretas para melhorar meus resultados"
                contextData={{ stats, allocation }}
                variant="outline"
              />
            </div>
          </CardContent>
        </Card>
          </>
        )}
        
      </div>
    </AppLayout>
  );
};

export default Dashboard;
