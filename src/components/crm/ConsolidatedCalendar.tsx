import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, DollarSign, FileText, Users } from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  date: string;
  type: "dividend" | "maturity" | "meeting" | "task";
  title: string;
  description?: string;
  client_name?: string;
  amount?: number;
  priority?: string;
}

interface ConsolidatedCalendarProps {
  clients: any[];
}

export const ConsolidatedCalendar = ({ clients }: ConsolidatedCalendarProps) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchEvents();
  }, [clients]);

  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const clientIds = clients.map(c => c.id);
      const today = new Date();
      const futureDate = addDays(today, 90); // Next 90 days

      // Fetch upcoming dividends from client assets
      const { data: assets } = await supabase
        .from("assets")
        .select("ticker, asset_name, client_id")
        .in("client_id", clientIds)
        .in("asset_class", ["Ações", "FIIs"]);

      const tickers = assets?.map(a => a.ticker) || [];
      
      const { data: dividends } = await supabase
        .from("dividends")
        .select("*")
        .in("ticker", tickers)
        .gte("payment_date", today.toISOString().split('T')[0])
        .lte("payment_date", futureDate.toISOString().split('T')[0])
        .order("payment_date");

      // Fetch maturity dates from fixed income assets
      const { data: fixedIncome } = await supabase
        .from("assets")
        .select("ticker, asset_name, maturity_date, client_id, invested_amount")
        .in("client_id", clientIds)
        .eq("asset_class", "Renda Fixa")
        .not("maturity_date", "is", null)
        .gte("maturity_date", today.toISOString().split('T')[0])
        .lte("maturity_date", futureDate.toISOString().split('T')[0])
        .order("maturity_date");

      // Fetch meetings
      const { data: meetings } = await supabase
        .from("meetings")
        .select("id, title, meeting_date, notes, client_id")
        .eq("advisor_id", user.id)
        .gte("meeting_date", today.toISOString())
        .lte("meeting_date", futureDate.toISOString())
        .order("meeting_date");

      // Fetch tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, description, due_date, priority, client_id")
        .eq("advisor_id", user.id)
        .eq("status", "pending")
        .gte("due_date", today.toISOString().split('T')[0])
        .lte("due_date", futureDate.toISOString().split('T')[0])
        .order("due_date");

      // Build client name lookup
      const clientLookup = clients.reduce((acc, client) => {
        acc[client.id] = client.name;
        return acc;
      }, {} as Record<string, string>);

      // Build asset-client lookup
      const assetClientLookup = assets?.reduce((acc, asset) => {
        acc[asset.ticker] = {
          client_id: asset.client_id,
          asset_name: asset.asset_name,
        };
        return acc;
      }, {} as Record<string, any>) || {};

      // Combine all events
      const allEvents: CalendarEvent[] = [];

      // Dividends
      dividends?.forEach(div => {
        const assetInfo = assetClientLookup[div.ticker];
        if (assetInfo) {
          allEvents.push({
            id: `div-${div.id}`,
            date: div.payment_date,
            type: "dividend",
            title: `Dividendo ${div.ticker}`,
            description: `${div.dividend_type || 'Provento'} - R$ ${Number(div.amount).toFixed(2)}`,
            client_name: clientLookup[assetInfo.client_id],
            amount: Number(div.amount),
          });
        }
      });

      // Maturities
      fixedIncome?.forEach(asset => {
        allEvents.push({
          id: `mat-${asset.ticker}-${asset.client_id}`,
          date: asset.maturity_date!,
          type: "maturity",
          title: `Vencimento: ${asset.asset_name}`,
          description: asset.invested_amount ? `Valor: R$ ${Number(asset.invested_amount).toLocaleString('pt-BR')}` : undefined,
          client_name: clientLookup[asset.client_id],
          amount: asset.invested_amount ? Number(asset.invested_amount) : undefined,
        });
      });

      // Meetings
      meetings?.forEach(meeting => {
        allEvents.push({
          id: `meet-${meeting.id}`,
          date: meeting.meeting_date.split('T')[0],
          type: "meeting",
          title: meeting.title,
          description: meeting.notes || undefined,
          client_name: meeting.client_id ? clientLookup[meeting.client_id] : undefined,
        });
      });

      // Tasks
      tasks?.forEach(task => {
        allEvents.push({
          id: `task-${task.id}`,
          date: task.due_date,
          type: "task",
          title: task.title,
          description: task.description || undefined,
          client_name: task.client_id ? clientLookup[task.client_id] : undefined,
          priority: task.priority,
        });
      });

      // Sort by date
      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "dividend":
        return <DollarSign className="h-4 w-4 text-success" />;
      case "maturity":
        return <FileText className="h-4 w-4 text-warning" />;
      case "meeting":
        return <Users className="h-4 w-4 text-info" />;
      case "task":
        return <CalendarIcon className="h-4 w-4 text-primary" />;
      default:
        return <CalendarIcon className="h-4 w-4" />;
    }
  };

  const getEventBadge = (type: string) => {
    const labels: Record<string, string> = {
      dividend: "Provento",
      maturity: "Vencimento",
      meeting: "Reunião",
      task: "Tarefa",
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  const filteredEvents = filter === "all" 
    ? events 
    : events.filter(e => e.type === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold">Calendário Consolidado</h3>
          <p className="text-muted-foreground">Próximos 90 dias - Todos os clientes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Todos
          </Button>
          <Button
            variant={filter === "dividend" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("dividend")}
          >
            Proventos
          </Button>
          <Button
            variant={filter === "maturity" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("maturity")}
          >
            Vencimentos
          </Button>
          <Button
            variant={filter === "meeting" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("meeting")}
          >
            Reuniões
          </Button>
          <Button
            variant={filter === "task" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("task")}
          >
            Tarefas
          </Button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nenhum evento nos próximos 90 dias.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card key={event.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{event.title}</h4>
                          {getEventBadge(event.type)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(event.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          {event.client_name && ` • ${event.client_name}`}
                        </p>
                        {event.description && (
                          <p className="text-sm mt-2">{event.description}</p>
                        )}
                        {event.priority && (
                          <Badge 
                            variant={event.priority === "high" ? "destructive" : "default"}
                            className="mt-2"
                          >
                            {event.priority === "high" ? "Alta" : event.priority === "medium" ? "Média" : "Baixa"}
                          </Badge>
                        )}
                      </div>
                      {event.amount && (
                        <div className="text-right">
                          <p className="text-lg font-bold text-success">
                            R$ {event.amount.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};