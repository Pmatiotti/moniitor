import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserRole } from "@/hooks/useUserRole";
import { Search, Check, X, UserCog, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface UserWithRole {
  id: string;
  email: string;
  full_name: string;
  roles: UserRole[];
  is_active?: boolean;
  created_at?: string;
  organization_id?: string;
  organization_name?: string;
}

export const UsersTable = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, is_active, created_at, organization_id')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Buscar organizações
      const profilesData = profiles as any[];
      const orgIds = [...new Set(profilesData.filter(p => p.organization_id).map(p => p.organization_id))];
      
      let orgMap = new Map();
      if (orgIds.length > 0) {
        const { data: organizations } = await supabase
          .from('organizations' as any)
          .select('id, name')
          .in('id', orgIds);

        orgMap = new Map(organizations?.map((org: any) => [org.id, org.name]) || []);
      }

      const usersWithRoles: UserWithRole[] = profilesData.map(profile => {
        const userRoles = roles.filter(r => r.user_id === profile.id).map(r => r.role as UserRole);
        return {
          ...profile,
          roles: userRoles.length > 0 ? userRoles : ['cliente'],
          organization_name: profile.organization_id ? orgMap.get(profile.organization_id) : undefined,
        };
      });

      return usersWithRoles;
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter as UserRole);
    
    return matchesSearch && matchesRole;
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role adicionado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar role: ' + error.message);
    },
  });

  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Role removido com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao remover role: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Status atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    },
  });

  const impersonateMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      // Save current admin session to localStorage before impersonating
      const { data: { session: adminSession } } = await supabase.auth.getSession();
      if (adminSession) {
        localStorage.setItem('admin_session_backup', JSON.stringify({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        }));
      }
      
      const { data, error } = await supabase.functions.invoke('start-impersonation', {
        body: { targetUserId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Store impersonation info in localStorage
      localStorage.setItem('is_impersonating', 'true');
      localStorage.setItem('admin_email', data.adminEmail);
      localStorage.setItem('impersonation_token', data.impersonationToken);
      
      // Set the new session with the impersonated user's tokens
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (sessionError) {
        toast.error('Erro ao trocar sessão: ' + sessionError.message);
        return;
      }

      toast.success('Impersonação iniciada com sucesso');
      // Redirect to dashboard after a short delay to allow session to be set
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    },
    onError: (error) => {
      toast.error('Erro ao impersonar usuário: ' + error.message);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Usuário excluído com sucesso');
      setUserToDelete(null);
    },
    onError: (error) => {
      toast.error('Erro ao excluir usuário: ' + error.message);
      setUserToDelete(null);
    },
  });

  const handleToggleRole = (userId: string, role: UserRole, currentRoles: UserRole[]) => {
    if (currentRoles.includes(role)) {
      // Remove role
      if (currentRoles.length === 1) {
        toast.error('Usuário precisa ter pelo menos um role');
        return;
      }
      removeRoleMutation.mutate({ userId, role });
    } else {
      // Add role
      addRoleMutation.mutate({ userId, role });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Roles</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="assessor">Assessor</SelectItem>
            <SelectItem value="gestor">Gestor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Organização</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.full_name || 'Sem nome'}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.organization_name ? (
                    <Badge variant="outline">{user.organization_name}</Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {(['admin', 'gestor', 'assessor', 'cliente'] as UserRole[]).map((role) => {
                      const hasRole = user.roles.includes(role);
                      return (
                        <Badge
                          key={role}
                          variant={hasRole ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => handleToggleRole(user.id, role, user.roles)}
                        >
                          {role === 'admin' ? 'Admin' : role === 'assessor' ? 'Assessor' : role === 'gestor' ? 'Gestor' : 'Cliente'}
                        </Badge>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "secondary"}>
                    {user.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy') : 'N/A'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActiveMutation.mutate({ 
                        userId: user.id, 
                        isActive: user.is_active ?? true 
                      })}
                      disabled={toggleActiveMutation.isPending}
                      title={user.is_active ? "Desativar" : "Ativar"}
                    >
                      {user.is_active ? (
                        <X className="h-4 w-4 text-destructive" />
                      ) : (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => impersonateMutation.mutate(user.id)}
                      disabled={impersonateMutation.isPending}
                      title="Impersonar usuário"
                    >
                      <UserCog className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUserToDelete(user)}
                      disabled={deleteUserMutation.isPending}
                      title="Excluir usuário"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>irreversível</strong>. O usuário <strong>{userToDelete?.full_name || userToDelete?.email}</strong> será excluído permanentemente, incluindo todos os seus dados associados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
