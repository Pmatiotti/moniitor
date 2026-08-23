import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet } from "lucide-react";

export const PluggyFinancialSummary = () => {
  const { data: accounts } = useQuery({
    queryKey: ["pluggy-accounts-summary"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pluggy_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data;
    },
  });

  const { data: creditCards } = useQuery({
    queryKey: ["pluggy-credit-cards-summary"],
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

  const formatCurrency = (value: number | null) => {
    if (!value) return "R$ 0,00";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalBalance = accounts?.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0) || 0;
  const totalCreditUsed = creditCards?.reduce((sum, card) => 
    sum + (Number(card.total_balance) || 0), 0) || 0;
  const totalCreditAvailable = creditCards?.reduce((sum, card) => 
    sum + (Number(card.available_credit) || 0), 0) || 0;

  if (!accounts?.length && !creditCards?.length) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo em Contas</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {accounts?.length || 0} conta(s) conectada(s)
          </p>
        </CardContent>
      </Card>

      {creditCards && creditCards.length > 0 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fatura Atual</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalCreditUsed)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {creditCards.length} cartão(ões)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Limite Disponível</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCreditAvailable)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Crédito disponível
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
