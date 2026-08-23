import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const usePluggySync = () => {
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { data, error } = await supabase.functions.invoke("pluggy-sync-data", {
        body: { itemId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Sincronizado: ${data.synced.accounts} contas, ${data.synced.transactions} transações, ${data.synced.investments} investimentos`
      );
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["pluggy-connections"] });
      queryClient.invalidateQueries({ queryKey: ["pluggy-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["pluggy-investments"] });
      queryClient.invalidateQueries({ queryKey: ["pluggy-portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["pluggy-credit-cards"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (error: any) => {
      console.error("Sync error:", error);
      toast.error("Erro ao sincronizar dados");
    },
  });

  return {
    syncData: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
  };
};
