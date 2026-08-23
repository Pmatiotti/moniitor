import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckSquare,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  FileText,
  Users,
  Plus,
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Action {
  id: string;
  title: string;
  action_type: string;
  priority: string;
  status: string;
  due_date: string | null;
  client_id: string;
}

interface NextActionsWidgetProps {
  clientId?: string;
  showClientName?: boolean;
  limit?: number;
}

export const NextActionsWidget = ({
  clientId,
  showClientName = false,
  limit = 5,
}: NextActionsWidgetProps) => {
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchActions();
  }, [clientId]);

  const fetchActions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("client_actions")
        .select("*")
        .eq("advisor_id", user.id)
        .eq("status", "pending")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit);

      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setActions(data || []);

      // Se mostrar nome do cliente, buscar os nomes
      if (showClientName && data && data.length > 0) {
        const clientIds = [...new Set(data.map((a) => a.client_id))];
        const { data: clientsData } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);

        if (clientsData) {
          const clientMap: Record<string, string> = {};
          clientsData.forEach((c) => {
            clientMap[c.id] = c.name;
          });
          setClients(clientMap);
        }
      }
    } catch (error) {
      console.error("Erro ao buscar ações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from("client_actions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", actionId);

      if (error) throw error;

      toast.success("Ação concluída!");
      fetchActions();
    } catch (error) {
      console.error("Erro ao completar ação:", error);
      toast.error("Erro ao completar ação");
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case "call":
        return <Phone className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "meeting":
        return <Calendar className="h-4 w-4" />;
      case "review":
        return <FileText className="h-4 w-4" />;
      case "onboarding":
        return <Users className="h-4 w-4" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-destructive";
      case "medium":
        return "text-warning";
      case "low":
        return "text-success";
      default:
        return "";
    }
  };

  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return { text: "Sem prazo", color: "text-muted-foreground" };

    const date = new Date(dueDate);
    const days = differenceInDays(date, new Date());

    if (isPast(date)) {
      return { text: `Atrasado ${Math.abs(days)} dias`, color: "text-destructive" };
    }

    if (days === 0) {
      return { text: "Vence hoje", color: "text-warning" };
    }

    if (days <= 3) {
      return { text: `${days} dias`, color: "text-warning" };
    }

    return { text: format(date, "dd/MM", { locale: ptBR }), color: "text-muted-foreground" };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckSquare className="h-5 w-5" />
            Próximas Ações
          </CardTitle>
          {actions.length > 0 && (
            <Badge variant="secondary">{actions.length}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="text-center py-6">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma ação pendente!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const dueStatus = getDueDateStatus(action.due_date);
              return (
                <div
                  key={action.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => handleCompleteAction(action.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className={getPriorityColor(action.priority)}>
                          {getActionIcon(action.action_type)}
                        </span>
                        <p className="font-medium text-sm truncate">{action.title}</p>
                      </div>
                      {action.due_date && (
                        <div className="flex items-center gap-1 text-xs shrink-0">
                          <Clock className={`h-3 w-3 ${dueStatus.color}`} />
                          <span className={dueStatus.color}>{dueStatus.text}</span>
                        </div>
                      )}
                    </div>
                    {showClientName && clients[action.client_id] && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {clients[action.client_id]}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
