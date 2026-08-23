import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Copy, Mail } from "lucide-react";
import { format } from "date-fns";

export const InvitationsTable = () => {
  const queryClient = useQueryClient();

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      toast.success('Convite removido com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao remover convite: ' + error.message);
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: { email, role },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao reenviar convite');
      return data;
    },
    onSuccess: () => {
      toast.success('Convite reenviado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao reenviar convite: ' + error.message);
    },
  });

  const copyInviteLink = (token: string) => {
    const appUrl = window.location.origin;
    const inviteUrl = `${appUrl}/invite/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success('Link copiado para a área de transferência');
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
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Expira em</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invitations?.map((invitation) => {
            const isExpired = new Date(invitation.expires_at) < new Date();
            const isAccepted = !!invitation.accepted_at;
            
            return (
              <TableRow key={invitation.id}>
                <TableCell>{invitation.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{invitation.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      isAccepted ? "default" : 
                      isExpired ? "secondary" : 
                      "outline"
                    }
                  >
                    {isAccepted ? "Aceito" : isExpired ? "Expirado" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(invitation.created_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  {format(new Date(invitation.expires_at), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    {!isAccepted && !isExpired && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyInviteLink(invitation.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    {!isAccepted && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resendInvitationMutation.mutate({ 
                          email: invitation.email, 
                          role: invitation.role 
                        })}
                        disabled={resendInvitationMutation.isPending}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInvitationMutation.mutate(invitation.id)}
                      disabled={deleteInvitationMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
