import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wallet, TrendingUp, TrendingDown, PiggyBank, Sparkles, Link2 } from "lucide-react";
import { AddTransactionDialog } from "@/components/finances/AddTransactionDialog";
import { TransactionsTable } from "@/components/finances/TransactionsTable";
import { BudgetManager } from "@/components/finances/BudgetManager";
import { CashFlowChart } from "@/components/finances/CashFlowChart";
import { CategoryManager } from "@/components/finances/CategoryManager";
import { PluggyAccountsOverview } from "@/components/finances/PluggyAccountsOverview";
import { PluggyFinancialSummary } from "@/components/finances/PluggyFinancialSummary";
import { PluggyConnections } from "@/components/finances/PluggyConnections";

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
}

export default function Finances() {
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    savingsRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [hasCategories, setHasCategories] = useState(true);
  const { toast } = useToast();

  const fetchFinancialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentMonth = new Date();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", firstDay.toISOString())
        .lte("transaction_date", lastDay.toISOString());

      if (error) throw error;

      const income = transactions
        ?.filter(t => t.type === "income")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      
      const expenses = transactions
        ?.filter(t => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const balance = income - expenses;
      const savingsRate = income > 0 ? (balance / income) * 100 : 0;

      setSummary({
        totalIncome: income,
        totalExpenses: expenses,
        balance,
        savingsRate,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: categories } = await supabase
        .from("categories")
        .select("id")
        .eq("user_id", user.id);

      setHasCategories((categories?.length || 0) > 0);
    } catch (error) {
      console.error("Error checking categories:", error);
    }
  };

  useEffect(() => {
    fetchFinancialData();
    checkCategories();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Finanças Pessoais</h1>
          <p className="text-muted-foreground">
            Gerencie suas receitas, despesas e orçamentos
          </p>
        </div>
        <AddTransactionDialog onSuccess={fetchFinancialData} />
      </div>

      {/* Pluggy Financial Summary */}
      <PluggyFinancialSummary />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">Mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(summary.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">Mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.balance)}
            </div>
            <p className="text-xs text-muted-foreground">Mês atual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Poupança</CardTitle>
            <PiggyBank className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary.savingsRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Do total de receitas</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="budgets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="budgets">Orçamentos</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="cashflow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger 
            value="categories" 
            className="relative"
          >
            Categorias
            {!hasCategories && (
              <Badge className="ml-2 bg-primary text-primary-foreground animate-pulse">
                <Sparkles className="h-3 w-3 mr-1" />
                Novo
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="banking" className="relative">
            <Link2 className="h-4 w-4 mr-2" />
            Instituições
            <Badge className="ml-2 bg-primary text-primary-foreground animate-pulse">
              <Sparkles className="h-3 w-3 mr-1" />
              Novo
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budgets" className="space-y-4">
          <BudgetManager refreshTrigger={summary.totalExpenses} />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="flex justify-end">
            <AddTransactionDialog onSuccess={fetchFinancialData} />
          </div>
          <TransactionsTable onUpdate={fetchFinancialData} />
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <CashFlowChart />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoryManager onCategoriesChange={checkCategories} />
        </TabsContent>

        <TabsContent value="banking" className="space-y-4">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Visualize e gerencie suas contas bancárias, cartões de crédito e investimentos conectados via Open Finance.
              Para conectar novas instituições, acesse <strong>Meu Perfil → Conectar Instituição Financeira</strong>.
            </p>
            <PluggyConnections />
            <PluggyAccountsOverview />
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  );
}
