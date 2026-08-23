import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MapPin, Power, Trash2, Users } from "lucide-react";
import { AuthorizedEmailsManager } from "./AuthorizedEmailsManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface OrganizationDetailsDialogProps {
  organization: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  onToggleStatus: (orgId: string, currentStatus: boolean) => void;
}

export const OrganizationDetailsDialog = ({
  organization,
  open,
  onOpenChange,
  onSuccess,
  onToggleStatus,
}: OrganizationDetailsDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Buscar usuários vinculados à organização com suas roles
  const { data: organizationUsers } = useQuery<Array<{ id: string; email: string; full_name: string; created_at: string; roles: string[] }>>({
    queryKey: ['organization-users', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];
      
      // Buscar profiles da organização
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('organization_id', organization.id)
        .order('full_name', { ascending: true });

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Buscar roles dos usuários
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Combinar profiles com roles
      return profiles.map(profile => ({
        ...profile,
        roles: roles?.filter(r => r.user_id === profile.id).map(r => r.role) || []
      }));
    },
    enabled: !!organization?.id,
  });

  if (!organization) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('organizations' as any)
        .delete()
        .eq('id', organization.id);

      if (error) {
        console.error('Erro ao excluir:', error);
        throw error;
      }

      // Fechar diálogos primeiro
      setDeleteDialogOpen(false);
      onOpenChange(false);

      // Invalidate e refetch
      await queryClient.invalidateQueries({ queryKey: ['organizations'] });
      
      toast({
        title: "Escritório excluído!",
        description: "O escritório foi removido com sucesso.",
      });
      
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir escritório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <DialogTitle>{organization.name}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Código: {organization.slug}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={organization.is_active ? "default" : "secondary"}>
                {organization.is_active ? "Ativo" : "Inativo"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleStatus(organization.id, organization.is_active)}
              >
                <Power className="h-4 w-4 mr-2" />
                {organization.is_active ? "Desativar" : "Ativar"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Usuários ({organizationUsers?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="emails">Emails Autorizados</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4">
              {organization.cnpj && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">CNPJ</p>
                    <p className="text-sm text-muted-foreground">{organization.cnpj}</p>
                  </div>
                </div>
              )}

              {organization.contact_email && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email de Contato</p>
                    <p className="text-sm text-muted-foreground">{organization.contact_email}</p>
                  </div>
                </div>
              )}

              {organization.contact_phone && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">{organization.contact_phone}</p>
                  </div>
                </div>
              )}

              {organization.address && (
                <div className="flex items-start gap-3 p-4 border rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Endereço</p>
                    <p className="text-sm text-muted-foreground">{organization.address}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            {organizationUsers && organizationUsers.length > 0 ? (
              <div className="space-y-2">
                {organizationUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{user.full_name || 'Sem nome'}</p>
                        {user.roles.map((role) => (
                          <Badge 
                            key={role} 
                            variant={role === 'admin' ? 'default' : role === 'gestor' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {role === 'admin' ? 'Admin' : 
                             role === 'gestor' ? 'Gestor' : 
                             role === 'assessor' ? 'Assessor' : 'Cliente'}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {user.created_at && format(new Date(user.created_at), 'dd/MM/yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum usuário vinculado a este escritório</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="emails">
            <AuthorizedEmailsManager organizationId={organization.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o escritório <strong>{organization.name}</strong>?
              <br /><br />
              Esta ação não pode ser desfeita e irá:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remover todos os vínculos de usuários com este escritório</li>
                <li>Excluir todos os emails autorizados</li>
                <li>Remover todos os clientes associados</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir Escritório"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
