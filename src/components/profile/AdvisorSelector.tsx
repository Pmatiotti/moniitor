import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UserCheck, UserX, Clock, Mail, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Advisor {
  user_id: string;
  full_name: string;
  email: string;
}

interface AdvisorLink {
  id: string;
  advisor_id: string;
  status: string;
}

export const AdvisorSelector = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user's linked advisor
  const { data: currentLink, isLoading: loadingLink } = useQuery({
    queryKey: ['advisor-link'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('client_advisor_links')
        .select('*')
        .eq('client_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      return data as AdvisorLink | null;
    },
  });

  // Get advisor profile if linked
  const { data: advisorProfile, isLoading: loadingAdvisor } = useQuery({
    queryKey: ['advisor-profile', currentLink?.advisor_id],
    queryFn: async () => {
      if (!currentLink?.advisor_id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', currentLink.advisor_id)
        .single();

      if (error) throw error;
      return data as { id: string; full_name: string; email: string } | null;
    },
    enabled: !!currentLink?.advisor_id,
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      if (!currentLink) return;

      const { error } = await supabase
        .from('client_advisor_links')
        .delete()
        .eq('id', currentLink.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['advisor-link'] });
      queryClient.invalidateQueries({ queryKey: ['advisor-profile'] });
      toast({
        title: "Vínculo removido",
        description: "Você não está mais vinculado a um assessor.",
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

  if (loadingLink || loadingAdvisor) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If linked to an advisor
  if (currentLink && advisorProfile) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{advisorProfile.full_name || 'Assessor'}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {advisorProfile.email}
              </p>
            </div>
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={unlinkMutation.isPending}
              >
                {unlinkMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Remover Vínculo
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover vínculo com assessor?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ao remover o vínculo, o assessor não terá mais acesso às suas informações 
                  de investimentos. Você poderá se vincular a outro assessor através de um novo convite.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => unlinkMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Remover Vínculo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // Not linked - show message about invitation-only linking
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/50">
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Aguardando convite de assessor</p>
          <p className="text-sm text-muted-foreground">
            Seu assessor enviará um convite para você se conectar à plataforma
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Por segurança, a vinculação com assessores só pode ser feita através de convite. 
        Se você já possui um assessor, solicite que ele envie um convite pela plataforma.
      </p>
    </div>
  );
};
