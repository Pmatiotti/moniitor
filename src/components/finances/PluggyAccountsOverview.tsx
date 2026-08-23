import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, CreditCard, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const PluggyAccountsOverview = () => {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["pluggy-accounts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pluggy_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: creditCards } = useQuery({
    queryKey: ["pluggy-credit-cards"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pluggy_credit_cards")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: portfolios } = useQuery({
    queryKey: ["pluggy-portfolios"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pluggy_investment_portfolios")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalBalance = accounts?.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0) || 0;
  const totalAvailableBalance = accounts?.reduce((sum, acc) => sum + (Number(acc.available_balance) || 0), 0) || 0;
  const totalCreditLimit = accounts?.reduce((sum, acc) => sum + (Number(acc.credit_limit) || 0), 0) || 0;
  const totalOverdraft = accounts?.reduce((sum, acc) => sum + (Number(acc.overdraft_limit) || 0), 0) || 0;
  const totalInvestments = portfolios?.reduce((sum, p) => sum + (Number(p.total_value) || 0), 0) || 0;
  const totalInvestmentGain = portfolios?.reduce((sum, p) => sum + (Number(p.total_gain) || 0), 0) || 0;

  if (isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">
              Disponível: {formatCurrency(totalAvailableBalance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Limite de Crédito</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCreditLimit)}</div>
            <p className="text-xs text-muted-foreground">
              {creditCards?.length || 0} cartão(ões)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cheque Especial</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalOverdraft)}</div>
            <p className="text-xs text-muted-foreground">
              Limite disponível
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investimentos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestments)}</div>
            <p className={`text-xs ${totalInvestmentGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalInvestmentGain >= 0 ? '+' : ''}{formatCurrency(totalInvestmentGain)} lucro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Detail */}
      <Card>
        <CardHeader>
          <CardTitle>Contas Bancárias</CardTitle>
          <CardDescription>Detalhes de todas as suas contas conectadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts?.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{account.account_name}</h4>
                    <Badge variant="outline">{account.account_type}</Badge>
                  </div>
                  {account.account_number && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Conta: {account.account_number}
                    </p>
                  )}
                  {account.owner_name && (
                    <p className="text-sm text-muted-foreground">
                      Titular: {account.owner_name}
                    </p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <div className="text-lg font-bold">
                    {formatCurrency(Number(account.balance))}
                  </div>
                  {account.available_balance && (
                    <div className="text-sm text-muted-foreground">
                      Disponível: {formatCurrency(Number(account.available_balance))}
                    </div>
                  )}
                  {account.credit_limit && account.credit_limit > 0 && (
                    <div className="text-sm text-blue-600">
                      Limite: {formatCurrency(Number(account.credit_limit))}
                    </div>
                  )}
                  {account.overdraft_limit && account.overdraft_limit > 0 && (
                    <div className="text-sm text-orange-600">
                      Cheque Especial: {formatCurrency(Number(account.overdraft_limit))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Credit Cards Detail */}
      {creditCards && creditCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cartões de Crédito</CardTitle>
            <CardDescription>Detalhes dos seus cartões</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creditCards.map((card) => (
                <div key={card.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{card.card_name}</h4>
                      {card.card_network && (
                        <Badge variant="outline">{card.card_network}</Badge>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground space-y-1">
                      {card.close_day && (
                        <p>Fechamento: dia {card.close_day}</p>
                      )}
                      {card.due_day && (
                        <p>Vencimento: dia {card.due_day}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    {card.total_balance && (
                      <div className="text-lg font-bold text-red-600">
                        Fatura: {formatCurrency(Number(card.total_balance))}
                      </div>
                    )}
                    {card.available_credit && (
                      <div className="text-sm text-green-600">
                        Disponível: {formatCurrency(Number(card.available_credit))}
                      </div>
                    )}
                    {card.minimum_payment && (
                      <div className="text-sm text-muted-foreground">
                        Mínimo: {formatCurrency(Number(card.minimum_payment))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Investment Portfolios */}
      {portfolios && portfolios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Carteiras de Investimento</CardTitle>
            <CardDescription>Resumo das suas carteiras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {portfolios.map((portfolio) => (
                <div key={portfolio.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">Carteira {portfolio.portfolio_type}</h4>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-lg font-bold">
                      {formatCurrency(Number(portfolio.total_value))}
                    </div>
                    {portfolio.total_gain && (
                      <div className={`text-sm ${Number(portfolio.total_gain) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {Number(portfolio.total_gain) >= 0 ? '+' : ''}{formatCurrency(Number(portfolio.total_gain))}
                        {portfolio.total_gain_percent && (
                          <span className="ml-1">
                            ({Number(portfolio.total_gain_percent).toFixed(2)}%)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
