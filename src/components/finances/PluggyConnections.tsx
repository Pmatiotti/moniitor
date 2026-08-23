import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePluggySync } from "@/hooks/usePluggySync";

export const PluggyConnections = () => {
  const queryClient = useQueryClient();
  const { syncData, isSyncing } = usePluggySync();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["pluggy-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluggy_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pluggy_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conexão removida com sucesso");
      queryClient.invalidateQueries({ queryKey: ["pluggy-connections"] });
    },
    onError: (error: any) => {
      console.error("Delete error:", error);
      toast.error("Erro ao remover conexão");
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Instituições Conectadas</CardTitle>
          <CardDescription>Nenhuma instituição financeira conectada</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instituições Conectadas</CardTitle>
        <CardDescription>
          Gerencie suas instituições financeiras e sincronize dados automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {connections.map((connection) => (
          <div
            key={connection.id}
            className="flex items-center justify-between p-4 border rounded-lg"
          >
            <div className="flex items-center gap-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <h4 className="font-medium">{connection.connector_name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={connection.status === "UPDATED" ? "default" : "secondary"}>
                    {connection.status}
                  </Badge>
                  {connection.last_sync_at && (
                    <span className="text-sm text-muted-foreground">
                      Última sinc: {format(new Date(connection.last_sync_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncData(connection.item_id)}
                disabled={isSyncing}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMutation.mutate(connection.id)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
