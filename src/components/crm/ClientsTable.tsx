import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ExternalLink, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/pages/CRM";

interface ClientsTableProps {
  clients: Client[];
  onRefresh: () => void;
  onSelectClient: (client: Client) => void;
  onEditClient?: (client: Client) => void;
}

export const ClientsTable = ({ clients, onRefresh, onSelectClient, onEditClient }: ClientsTableProps) => {
  const { toast } = useToast();

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Cliente removido",
        description: "O cliente foi removido do CRM.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao remover cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClientClick = (client: Client, event: React.MouseEvent) => {
    // Ctrl+Click ou Cmd+Click abre em nova aba
    if (event.ctrlKey || event.metaKey) {
      window.open(`/crm/client/${client.id}`, '_blank');
    } else {
      onSelectClient(client);
    }
  };

  const handleOpenNewTab = (clientId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    window.open(`/crm/client/${clientId}`, '_blank');
  };

  const handleEdit = (client: Client, event: React.MouseEvent) => {
    event.stopPropagation();
    onEditClient?.(client);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      novo: "secondary",
      inactive: "destructive",
    };
    const labels: Record<string, string> = {
      active: "Ativo",
      novo: "Novo",
      inactive: "Inativo",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getFrequencyLabel = (frequency: string | null | undefined) => {
    const labels: Record<string, string> = {
      semanal: "Semanal",
      quinzenal: "Quinzenal",
      mensal: "Mensal",
      bimestral: "Bimestral",
      trimestral: "Trimestral",
    };
    return labels[frequency || "mensal"] || "Mensal";
  };

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Régua</TableHead>
          <TableHead>Perfil de Risco</TableHead>
          <TableHead className="text-right">Patrimônio</TableHead>
          <TableHead className="text-right">Última Atualização</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id} className="hover:bg-muted/50">
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleClientClick(client, e)}
                  className="text-primary hover:underline cursor-pointer text-left font-medium"
                  title="Clique para abrir no painel • Ctrl+Clique para nova aba"
                >
                  {client.name}
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => handleOpenNewTab(client.id, e)}
                  title="Abrir em nova aba"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </TableCell>
            <TableCell>{client.email || '-'}</TableCell>
            <TableCell>{getStatusBadge(client.status)}</TableCell>
            <TableCell>
              <Badge variant="outline">{getFrequencyLabel((client as any).contact_frequency)}</Badge>
            </TableCell>
            <TableCell>
              {client.risk_profile ? (
                <Badge variant="outline">{client.risk_profile}</Badge>
              ) : '-'}
            </TableCell>
            <TableCell className="text-right">
              {client.portfolio_value ? formatCurrency(Number(client.portfolio_value)) : '-'}
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {client.last_portfolio_update 
                ? new Date(client.last_portfolio_update).toLocaleDateString('pt-BR')
                : 'Nunca'}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleEdit(client, e)}
                  title="Editar cliente"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(client.id)}
                  title="Excluir cliente"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
