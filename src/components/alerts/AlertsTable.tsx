import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert } from "@/pages/Alerts";
import { EditAlertDialog } from "./EditAlertDialog";

interface AlertsTableProps {
  alerts: Alert[];
  onRefresh: () => void;
}

export const AlertsTable = ({ alerts, onRefresh }: AlertsTableProps) => {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("alerts").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Alerta removido",
        description: "O alerta foi removido com sucesso.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao remover alerta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggle = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from("alerts")
        .update({ is_active: !currentState })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: currentState ? "Alerta desativado" : "Alerta ativado",
        description: `O alerta foi ${currentState ? 'desativado' : 'ativado'} com sucesso.`,
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar alerta",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (alert: Alert) => {
    setSelectedAlert(alert);
    setEditDialogOpen(true);
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      price_variation: "Variação de Preço",
      price_drop: "Queda Significativa",
      target_price: "Preço Alvo",
      dividend: "Novo Provento",
      dividend_paid: "Provento Pago",
      fixed_income_maturity: "Vencimento RF",
      corporate_event: "Fato Relevante",
      event: "Evento",
    };
    return labels[type] || type;
  };

  const getConditionDisplay = (alert: Alert) => {
    if (alert.alert_type === "target_price") {
      const targetPrice = (alert as any).target_price;
      if (targetPrice) {
        return (
          <span>
            {alert.comparison_type === 'above' ? '≥' : '≤'} R$ {Number(targetPrice).toFixed(2)}
          </span>
        );
      }
    }
    
    if (alert.alert_type === "fixed_income_maturity") {
      return (
        <span>
          {alert.threshold_value || 30} dias antes
        </span>
      );
    }

    if (alert.threshold_value) {
      return (
        <span>
          {alert.comparison_type === 'above' ? '↑' : '↓'} {alert.threshold_value}%
        </span>
      );
    }
    
    return '-';
  };

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum alerta configurado ainda.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticker</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Condição</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Disparos</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {alerts.map((alert) => (
            <TableRow key={alert.id}>
              <TableCell className="font-medium">
                {alert.alert_type === "fixed_income_maturity" ? "Todos RF" : alert.ticker}
              </TableCell>
              <TableCell>{getAlertTypeLabel(alert.alert_type)}</TableCell>
              <TableCell>{getConditionDisplay(alert)}</TableCell>
              <TableCell>
                <Badge variant={alert.is_active ? "default" : "secondary"}>
                  {alert.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{alert.trigger_count}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Switch
                    checked={alert.is_active}
                    onCheckedChange={() => handleToggle(alert.id, alert.is_active)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(alert)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(alert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <EditAlertDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        alert={selectedAlert}
        onSuccess={() => {
          onRefresh();
          setEditDialogOpen(false);
          setSelectedAlert(null);
        }}
      />
    </>
  );
};
