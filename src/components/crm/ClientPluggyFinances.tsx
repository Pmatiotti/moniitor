import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, CreditCard, TrendingUp, Wallet, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePluggySync } from "@/hooks/usePluggySync";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ClientPluggyFinancesProps {
  clientId: string;
}

export const ClientPluggyFinances = ({ clientId }: ClientPluggyFinancesProps) => {
  const { syncData, isSyncing } = usePluggySync();

  // Buscar conexões Pluggy do cliente
  const { data: connections, isLoading: loadingConnections } = useQuery({
    queryKey: ["client-pluggy-connections", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluggy_items")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar contas bancárias
  const { data: accounts, isLoading: loadingAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: ["client-pluggy-accounts", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluggy_accounts")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar cartões de crédito
  const { data: creditCards, isLoading: loadingCards } = useQuery({
    queryKey: ["client-pluggy-credit-cards", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluggy_credit_cards")
        .select("*")
        .eq("user_id", clientId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Buscar investimentos
  const { data: investments, isLoading: loadingInvestments } = useQuery({
    queryKey: ["client-pluggy-investments", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluggy_investments")
        .select("*")
        .eq("user_id", clientId)
        .order("amount", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSync = async (itemId: string) => {
    try {
      await syncData(itemId);
      await refetchAccounts();
    } catch (error) {
      console.error("Erro ao sincronizar:", error);
      toast.error("Erro ao sincronizar dados");
    }
  };

  if (loadingConnections || loadingAccounts || loadingCards || loadingInvestments) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Este cliente ainda não conectou nenhuma instituição financeira via Open Finance.
        </AlertDescription>
      </Alert>
    );
  }

  // Calcular totais
  const totalBalance = accounts?.reduce((sum, acc) => sum + (acc.balance || 0), 0) || 0;
  const totalAvailable = accounts?.reduce((sum, acc) => sum + (acc.available_balance || 0), 0) || 0;
  const totalCreditLimit = creditCards?.reduce((sum, card) => sum + (card.available_credit || 0), 0) || 0;
  const totalInvestments = investments?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo Total</p>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10">
              <Wallet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Disponível</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAvailable)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Limite Crédito</p>
              <p className="text-2xl font-bold">{formatCurrency(totalCreditLimit)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-500/10">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Investimentos</p>
              <p className="text-2xl font-bold">{formatCurrency(totalInvestments)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Conexões */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Instituições Conectadas</h3>
        <div className="space-y-3">
          {connections.map((connection) => (
            <div
              key={connection.item_id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{connection.connector_name}</p>
                  <p className="text-sm text-muted-foreground">
                    Conectado em {new Date(connection.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSync(connection.item_id)}
                disabled={isSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                Sincronizar
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Contas Bancárias */}
      {accounts && accounts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Contas Bancárias</h3>
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <p className="font-medium">{account.account_name}</p>
                  <p className="text-sm text-muted-foreground">{account.account_type}</p>
                  {account.account_number && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Conta: {account.account_number}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(account.balance)}</p>
                  <p className="text-sm text-muted-foreground">
                    Disponível: {formatCurrency(account.available_balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Cartões de Crédito */}
      {creditCards && creditCards.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Cartões de Crédito</h3>
          <div className="space-y-3">
            {creditCards.map((card) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <p className="font-medium">{card.card_name}</p>
                  <p className="text-sm text-muted-foreground">{card.card_network}</p>
                  {card.due_day && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Vencimento: dia {card.due_day}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(card.available_credit)}</p>
                  <p className="text-sm text-muted-foreground">
                    Fatura: {formatCurrency(card.total_balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Investimentos */}
      {investments && investments.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Investimentos</h3>
          <div className="space-y-3">
            {investments.slice(0, 10).map((investment) => (
              <div
                key={investment.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div>
                  <p className="font-medium">{investment.investment_name}</p>
                  <p className="text-sm text-muted-foreground">{investment.investment_type}</p>
                  {investment.quantity && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Quantidade: {investment.quantity}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(investment.amount)}</p>
                  {investment.current_price && (
                    <p className="text-sm text-muted-foreground">
                      Preço: {formatCurrency(investment.current_price)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {investments.length > 10 && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                E mais {investments.length - 10} investimentos...
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
