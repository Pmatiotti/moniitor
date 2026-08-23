import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";

interface AdvisorLinkWithNames {
  id: string;
  client_name: string;
  client_email: string;
  advisor_name: string;
  advisor_email: string;
  status: string;
  created_at: string;
}

export const AdvisorLinksTable = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['advisor-links'],
    queryFn: async () => {
      // First get all links
      const { data: linksData, error: linksError } = await supabase
        .from('client_advisor_links')
        .select('id, status, created_at, client_id, advisor_id');

      if (linksError) throw linksError;

      if (!linksData || linksData.length === 0) {
        return [];
      }

      // Get all unique user IDs
      const userIds = [...new Set([
        ...linksData.map(l => l.client_id),
        ...linksData.map(l => l.advisor_id),
      ])];

      // Fetch profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Map profiles by ID for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      // Combine the data
      return linksData.map((link) => ({
        id: link.id,
        client_name: profilesMap.get(link.client_id)?.full_name || 'Sem nome',
        client_email: profilesMap.get(link.client_id)?.email || '',
        advisor_name: profilesMap.get(link.advisor_id)?.full_name || 'Sem nome',
        advisor_email: profilesMap.get(link.advisor_id)?.email || '',
        status: link.status,
        created_at: link.created_at,
      })) as AdvisorLinkWithNames[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase
        .from('client_advisor_links')
        .delete()
        .eq('id', linkId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisor-links'] });
      toast({
        title: "Vínculo removido",
        description: "O vínculo foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover vínculo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Carregando vínculos...</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>E-mail do Cliente</TableHead>
          <TableHead>Assessor</TableHead>
          <TableHead>E-mail do Assessor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data de Criação</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {links.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              Nenhum vínculo encontrado
            </TableCell>
          </TableRow>
        ) : (
          links.map((link) => (
            <TableRow key={link.id}>
              <TableCell className="font-medium">{link.client_name}</TableCell>
              <TableCell>{link.client_email}</TableCell>
              <TableCell>{link.advisor_name}</TableCell>
              <TableCell>{link.advisor_email}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  link.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {link.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </TableCell>
              <TableCell>{format(new Date(link.created_at), 'dd/MM/yyyy')}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMutation.mutate(link.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};