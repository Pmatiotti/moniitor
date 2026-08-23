import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, RefreshCw, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePluggySync } from "@/hooks/usePluggySync";
import { Badge } from "@/components/ui/badge";

export const PluggyConnectionsSummary = () => {
  const navigate = useNavigate();
  const { syncData, isSyncing } = usePluggySync();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["pluggy-connections-summary"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("pluggy_items")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleSyncAll = async () => {
    if (!connections || connections.length === 0) return;
    
    for (const connection of connections) {
      await syncData(connection.item_id);
    }
  };

  if (isLoading || !connections || connections.length === 0) {
    return null;
  }

  const activeConnections = connections.filter(c => c.status === "UPDATED" || c.status === "ACTIVE");

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Instituições Conectadas
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {activeConnections.length} {activeConnections.length === 1 ? 'conexão' : 'conexões'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex flex-wrap gap-1.5">
            {connections.slice(0, 3).map((conn) => (
              <Badge key={conn.id} variant="outline" className="text-xs">
                {conn.connector_name}
              </Badge>
            ))}
            {connections.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{connections.length - 3}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncAll}
            disabled={isSyncing}
            className="flex-1"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/finances")}
            className="flex-1"
          >
            <ExternalLink className="h-3 w-3 mr-1.5" />
            Ver Detalhes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
