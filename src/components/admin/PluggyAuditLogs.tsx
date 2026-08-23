import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const PluggyAuditLogs = () => {
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["pluggy-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluggy_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const { data: rateLimits } = useQuery({
    queryKey: ["pluggy-rate-limits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pluggy_rate_limits")
        .select("*")
        .order("last_attempt", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getActionBadge = (action: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      connection_created: { variant: "default", icon: Shield },
      connection_deleted: { variant: "destructive", icon: AlertTriangle },
      sync_started: { variant: "secondary", icon: Activity },
      sync_completed: { variant: "default", icon: Shield },
      sync_failed: { variant: "destructive", icon: AlertTriangle },
      token_created: { variant: "secondary", icon: Shield },
    };

    const config = variants[action] || { variant: "default", icon: Shield };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {action.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return <div>Carregando logs de auditoria...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Logs de Auditoria - Integração Bancária
          </CardTitle>
          <CardDescription>
            Histórico completo de todas as ações relacionadas às conexões bancárias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Item ID</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{getActionBadge(log.action)}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.item_id ? `${log.item_id.substring(0, 8)}...` : "-"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {JSON.stringify(log.details)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Rate Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Rate Limiting - Status Atual
          </CardTitle>
          <CardDescription>
            Monitoramento de limites de uso por usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Janela Iniciada</TableHead>
                <TableHead>Última Tentativa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rateLimits?.map((limit) => (
                <TableRow key={limit.id}>
                  <TableCell className="font-mono text-xs">
                    {limit.user_id.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{limit.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={limit.attempt_count > 15 ? "destructive" : "secondary"}>
                      {limit.attempt_count} / 20
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(limit.window_start), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(limit.last_attempt), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
