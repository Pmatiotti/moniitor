import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AuditLogsTable = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          *,
          profiles:user_id (
            email,
            full_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const getActionBadge = (action: string) => {
    const actionMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      'role_assigned': { label: 'Role Atribuído', variant: 'default' },
      'role_changed': { label: 'Role Alterado', variant: 'outline' },
      'role_removed': { label: 'Role Removido', variant: 'destructive' },
      'invitation_sent': { label: 'Convite Enviado', variant: 'default' },
      'login': { label: 'Login', variant: 'secondary' },
      'logout': { label: 'Logout', variant: 'secondary' },
    };

    return actionMap[action] || { label: action, variant: 'outline' as const };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data/Hora</TableHead>
            <TableHead>Usuário</TableHead>
            <TableHead>Ação</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs?.map((log) => {
            const actionBadge = getActionBadge(log.action);
            const user = log.profiles as any;
            
            return (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap">
                  {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {user?.full_name || user?.email || 'Sistema'}
                </TableCell>
                <TableCell>
                  <Badge variant={actionBadge.variant}>
                    {actionBadge.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.details ? JSON.stringify(log.details) : '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
