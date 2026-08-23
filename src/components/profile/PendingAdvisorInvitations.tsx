import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Check, X, Clock, Loader2, Mail } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Invitation {
  id: string;
  advisor_id: string;
  message: string | null;
  created_at: string;
  expires_at: string;
  advisor_name: string | null;
  advisor_email: string | null;
}

export const PendingAdvisorInvitations = () => {
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: invitations, isLoading } = useQuery({
    queryKey: ['pending-advisor-invitations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get user's email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (!profile?.email) return [];

      // Get pending invitations for this email
      const { data, error } = await supabase
        .from('advisor_client_invitations')
        .select('id, advisor_id, message, created_at, expires_at')
        .or(`client_user_id.eq.${user.id},client_email.ilike.${profile.email}`)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get advisor names
      const advisorIds = [...new Set(data?.map(inv => inv.advisor_id) || [])];
      
      if (advisorIds.length === 0) return [];

      const { data: advisors } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', advisorIds);

      const advisorMap = new Map(advisors?.map(a => [a.id, a]) || []);

      return (data || []).map(inv => ({
        ...inv,
        advisor_name: advisorMap.get(inv.advisor_id)?.full_name || 'Assessor',
        advisor_email: advisorMap.get(inv.advisor_id)?.email || null
      })) as Invitation[];
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc('accept_advisor_invitation', {
        p_invitation_id: invitationId
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; advisor_name?: string };
      if (!result.success) {
        throw new Error(result.error || 'Falha ao aceitar convite');
      }
      
      return result;
    },
    onSuccess: (result) => {
      toast.success(`Você está agora vinculado a ${result.advisor_name || 'seu assessor'}!`);
      queryClient.invalidateQueries({ queryKey: ['pending-advisor-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['advisor-link'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao aceitar convite');
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc('reject_advisor_invitation', {
        p_invitation_id: invitationId
      });
      
      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Falha ao recusar convite');
      }
      
      return result;
    },
    onSuccess: () => {
      toast.success('Convite recusado');
      queryClient.invalidateQueries({ queryKey: ['pending-advisor-invitations'] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao recusar convite');
    },
    onSettled: () => {
      setProcessingId(null);
    }
  });

  const handleAccept = (invitationId: string) => {
    setProcessingId(invitationId);
    acceptMutation.mutate(invitationId);
  };

  const handleReject = (invitationId: string) => {
    setProcessingId(invitationId);
    rejectMutation.mutate(invitationId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Convites de Assessores
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!invitations || invitations.length === 0) {
    return null; // Don't show card if no pending invitations
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Convites de Assessores
              <Badge variant="secondary" className="ml-2">
                {invitations.length} pendente{invitations.length > 1 ? 's' : ''}
              </Badge>
            </CardTitle>
            <CardDescription>
              Assessores que desejam acompanhar seu patrimônio
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{invitation.advisor_name}</span>
                  {invitation.advisor_email && (
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {invitation.advisor_email}
                    </span>
                  )}
                </div>
                {invitation.message && (
                  <p className="text-sm text-muted-foreground italic">
                    "{invitation.message}"
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>
                    Recebido {formatDistanceToNow(new Date(invitation.created_at), { 
                      addSuffix: true,
                      locale: ptBR 
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    Expira {formatDistanceToNow(new Date(invitation.expires_at), { 
                      addSuffix: true,
                      locale: ptBR 
                    })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(invitation.id)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id && rejectMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-1" />
                      Recusar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleAccept(invitation.id)}
                  disabled={processingId === invitation.id}
                >
                  {processingId === invitation.id && acceptMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Aceitar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
