import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, 
  Car, 
  Gem, 
  Briefcase, 
  Plus, 
  Upload, 
  TrendingUp,
  TrendingDown,
  FileText,
  Wallet,
  CreditCard
} from "lucide-react";
import { AddPatrimonyDialog } from "./AddPatrimonyDialog";
import { ImportIRPFDialog } from "./ImportIRPFDialog";
import { AddLiabilityDialog } from "./AddLiabilityDialog";
import { PatrimonyList } from "./PatrimonyList";
import { LiabilitiesList } from "./LiabilitiesList";
import { NetWorthCard } from "./NetWorthCard";
import { NetWorthChart } from "./NetWorthChart";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Link } from "react-router-dom";

// Simple investments list component
const InvestmentsList = ({ assets, formatCurrency }: { assets: any[], formatCurrency: (v: number) => string }) => {
  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum investimento cadastrado.
        <Link to="/portfolio" className="block mt-2 text-primary hover:underline">
          Ir para Carteira
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-auto">
      {assets.slice(0, 20).map((asset: any) => {
        const value = asset.current_price 
          ? asset.quantity * asset.current_price 
          : asset.invested_amount || (asset.quantity * asset.average_price);
        return (
          <div key={asset.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">{asset.ticker}</p>
                <p className="text-xs text-muted-foreground">{asset.asset_class}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">{formatCurrency(value)}</p>
              <p className="text-xs text-muted-foreground">{asset.quantity} unid.</p>
            </div>
          </div>
        );
      })}
      {assets.length > 20 && (
        <Link to="/portfolio" className="block text-center text-sm text-primary hover:underline py-2">
          Ver todos os {assets.length} investimentos
        </Link>
      )}
    </div>
  );
};

interface PatrimonyDashboardProps {
  clientId?: string;
}

const ASSET_CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  investimentos: { label: "Investimentos", icon: Wallet, color: "hsl(var(--primary))" },
  imovel: { label: "Imóveis", icon: Building2, color: "hsl(var(--chart-1))" },
  participacao_societaria: { label: "Participações", icon: Briefcase, color: "hsl(var(--chart-2))" },
  bem_movel: { label: "Bens Móveis", icon: Car, color: "hsl(var(--chart-3))" },
  direitos: { label: "Direitos", icon: FileText, color: "hsl(var(--chart-4))" },
  outros: { label: "Outros", icon: Gem, color: "hsl(var(--chart-5))" },
};

const LIABILITY_CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  financiamento_imobiliario: { label: "Financ. Imobiliário", icon: Building2, color: "hsl(var(--chart-1))" },
  financiamento_veicular: { label: "Financ. Veicular", icon: Car, color: "hsl(var(--chart-2))" },
  emprestimo_pessoal: { label: "Empréstimo", icon: Wallet, color: "hsl(var(--chart-3))" },
  cartao_credito: { label: "Cartão de Crédito", icon: CreditCard, color: "hsl(var(--chart-4))" },
  outros: { label: "Outras Dívidas", icon: FileText, color: "hsl(var(--chart-5))" },
};

export const PatrimonyDashboard = ({ clientId }: PatrimonyDashboardProps) => {
  const [addAssetDialogOpen, setAddAssetDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addLiabilityDialogOpen, setAddLiabilityDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ativos");

  // Fetch patrimony assets (non-financial)
  const { data: patrimonyAssets, isLoading: isLoadingPatrimony, refetch: refetchAssets } = useQuery({
    queryKey: ['patrimony-assets', clientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as any[];

      let query = supabase
        .from('patrimony_assets')
        .select('*')
        .eq('is_active', true)
        .order('current_value', { ascending: false, nullsFirst: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.eq('user_id', user.id).is('client_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch investment portfolio (financial assets)
  const { data: investmentAssets, isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['investment-assets', clientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as any[];

      let query = supabase
        .from('assets')
        .select('*')
        .order('updated_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.eq('user_id', user.id).is('client_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch liabilities
  const { data: liabilities, isLoading: isLoadingLiabilities, refetch: refetchLiabilities } = useQuery({
    queryKey: ['patrimony-liabilities', clientId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [] as any[];

      let query = supabase
        .from('patrimony_liabilities')
        .select('*')
        .eq('is_active', true)
        .order('current_balance', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      } else {
        query = query.eq('user_id', user.id).is('client_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = isLoadingPatrimony || isLoadingInvestments || isLoadingLiabilities;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate total investments from portfolio
  const totalInvestments = (investmentAssets || []).reduce((acc: number, asset: any) => {
    const value = asset.current_price 
      ? asset.quantity * asset.current_price 
      : asset.invested_amount || (asset.quantity * asset.average_price);
    return acc + value;
  }, 0);

  // Calculate totals by category for patrimony assets
  const assetCategoryTotals: Record<string, number> = (patrimonyAssets || []).reduce((acc: Record<string, number>, asset: any) => {
    const category = asset.category || 'outros';
    acc[category] = (acc[category] || 0) + (asset.current_value || asset.acquisition_value || 0);
    return acc;
  }, {} as Record<string, number>);

  // Add investments to category totals
  assetCategoryTotals['investimentos'] = totalInvestments;

  const totalAssets = Object.entries(assetCategoryTotals)
    .filter(([key]) => key !== 'investimentos')
    .reduce((a, [_, b]) => a + b, 0);

  // Calculate totals by category for liabilities
  const liabilityCategoryTotals: Record<string, number> = (liabilities || []).reduce((acc: Record<string, number>, liability: any) => {
    const category = liability.category || 'outros';
    acc[category] = (acc[category] || 0) + (liability.current_balance || 0);
    return acc;
  }, {} as Record<string, number>);

  const totalLiabilities = Object.values(liabilityCategoryTotals).reduce((a: number, b: number) => a + b, 0);

  const assetPieData = Object.entries(assetCategoryTotals)
    .filter(([_, value]) => value > 0)
    .map(([category, value]) => ({
      name: ASSET_CATEGORY_CONFIG[category]?.label || category,
      value: value as number,
      color: ASSET_CATEGORY_CONFIG[category]?.color || "hsl(var(--muted))",
    }));

  const liabilityPieData = Object.entries(liabilityCategoryTotals)
    .filter(([_, value]) => value > 0)
    .map(([category, value]) => ({
      name: LIABILITY_CATEGORY_CONFIG[category]?.label || category,
      value: value as number,
      color: LIABILITY_CATEGORY_CONFIG[category]?.color || "hsl(var(--muted))",
    }));

  const filteredAssets = selectedCategory && selectedCategory !== 'investimentos'
    ? (patrimonyAssets || []).filter((a: any) => a.category === selectedCategory)
    : patrimonyAssets || [];

  const filteredLiabilities = selectedCategory
    ? (liabilities || []).filter((l: any) => l.category === selectedCategory)
    : liabilities || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Patrimônio Consolidado</h2>
          <p className="text-muted-foreground">
            Visão completa de ativos, passivos e patrimônio líquido
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar IRPF
          </Button>
          {activeTab === "ativos" ? (
            <Button onClick={() => setAddAssetDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Bem
            </Button>
          ) : (
            <Button onClick={() => setAddLiabilityDialogOpen(true)} variant="destructive">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Passivo
            </Button>
          )}
        </div>
      </div>

      {/* Net Worth Card */}
      <NetWorthCard 
        totalAssets={totalAssets}
        totalInvestments={totalInvestments}
        totalLiabilities={totalLiabilities}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSelectedCategory(null); }}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="ativos" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Ativos
          </TabsTrigger>
          <TabsTrigger value="passivos" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Passivos
          </TabsTrigger>
          <TabsTrigger value="evolucao">
            Evolução
          </TabsTrigger>
        </TabsList>

        {/* Assets Tab */}
        <TabsContent value="ativos" className="space-y-6 mt-6">
          {/* Category Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {/* Total Assets Card */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${!selectedCategory ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <Badge variant="secondary">
                    {(patrimonyAssets?.length || 0) + (investmentAssets?.length || 0)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAssets + totalInvestments)}
                </div>
                <p className="text-xs text-muted-foreground">Total Ativos</p>
              </CardContent>
            </Card>

            {Object.entries(ASSET_CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const value = assetCategoryTotals[key] || 0;
              const count = key === 'investimentos' 
                ? investmentAssets?.length || 0
                : (patrimonyAssets || []).filter((a: any) => a.category === key).length;
              
              return (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === key ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5" style={{ color: config.color }} />
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatCurrency(value)}</div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                {assetPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={assetPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {assetPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Nenhum ativo cadastrado
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Asset List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedCategory 
                      ? ASSET_CATEGORY_CONFIG[selectedCategory]?.label 
                      : 'Todos os Ativos'}
                  </CardTitle>
                  {selectedCategory && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                      Ver todos
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {selectedCategory === 'investimentos' ? (
                  <InvestmentsList assets={investmentAssets || []} formatCurrency={formatCurrency} />
                ) : (
                  <PatrimonyList 
                    assets={filteredAssets} 
                    onRefresh={refetchAssets}
                    categoryConfig={ASSET_CATEGORY_CONFIG}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Liabilities Tab */}
        <TabsContent value="passivos" className="space-y-6 mt-6">
          {/* Category Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {/* Total Liabilities Card */}
            <Card 
              className={`cursor-pointer transition-all hover:shadow-md ${!selectedCategory ? 'ring-2 ring-destructive' : ''}`}
              onClick={() => setSelectedCategory(null)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <Badge variant="secondary">
                    {liabilities?.length || 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(totalLiabilities)}
                </div>
                <p className="text-xs text-muted-foreground">Total Passivos</p>
              </CardContent>
            </Card>

            {Object.entries(LIABILITY_CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const value = liabilityCategoryTotals[key] || 0;
              const count = (liabilities || []).filter((l: any) => l.category === key).length;
              
              return (
                <Card 
                  key={key}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedCategory === key ? 'ring-2 ring-destructive' : ''}`}
                  onClick={() => setSelectedCategory(selectedCategory === key ? null : key)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Icon className="h-5 w-5" style={{ color: config.color }} />
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-bold">{formatCurrency(value)}</div>
                    <p className="text-xs text-muted-foreground">{config.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chart */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Distribuição de Passivos</CardTitle>
              </CardHeader>
              <CardContent>
                {liabilityPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={liabilityPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {liabilityPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                    Nenhum passivo cadastrado 🎉
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Liabilities List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {selectedCategory 
                      ? LIABILITY_CATEGORY_CONFIG[selectedCategory]?.label 
                      : 'Todos os Passivos'}
                  </CardTitle>
                  {selectedCategory && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                      Ver todos
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <LiabilitiesList 
                  liabilities={filteredLiabilities} 
                  onRefresh={refetchLiabilities}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evolution Tab */}
        <TabsContent value="evolucao" className="mt-6">
          <NetWorthChart clientId={clientId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddPatrimonyDialog
        open={addAssetDialogOpen}
        onOpenChange={setAddAssetDialogOpen}
        onSuccess={() => {
          refetchAssets();
          setAddAssetDialogOpen(false);
        }}
        clientId={clientId}
      />

      <ImportIRPFDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          refetchAssets();
          setImportDialogOpen(false);
        }}
        clientId={clientId}
      />

      <AddLiabilityDialog
        open={addLiabilityDialogOpen}
        onOpenChange={setAddLiabilityDialogOpen}
        onSuccess={() => {
          refetchLiabilities();
          setAddLiabilityDialogOpen(false);
        }}
        clientId={clientId}
      />
    </div>
  );
};
