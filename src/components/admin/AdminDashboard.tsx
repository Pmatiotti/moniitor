import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Shield, AlertCircle } from "lucide-react";

interface AdminDashboardProps {
  onNavigateToTab?: (tab: string) => void;
}

export const AdminDashboard = ({ onNavigateToTab }: AdminDashboardProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // Get total users by role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role');

      if (rolesError) throw rolesError;

      // Get all profiles with creation date
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('created_at, is_active');

      if (profilesError) throw profilesError;

      // Count users by role
      const roleCount = {
        admin: roles.filter(r => r.role === 'admin').length,
        assessor: roles.filter(r => r.role === 'assessor').length,
        cliente: roles.filter(r => r.role === 'cliente').length,
      };

      // Count active users (created in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentUsers = profiles.filter(p => 
        new Date(p.created_at) >= thirtyDaysAgo
      ).length;

      // Count inactive accounts
      const inactiveAccounts = profiles.filter(p => p.is_active === false).length;

      // Get pending invitations
      const { data: invitations, error: invError } = await supabase
        .from('invitations')
        .select('id')
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (invError) throw invError;

      return {
        totalUsers: profiles.length,
        roleCount,
        recentUsers,
        inactiveAccounts,
        pendingInvitations: invitations.length,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total de Usuários",
      value: stats?.totalUsers || 0,
      description: "Usuários cadastrados na plataforma",
      icon: Users,
      color: "text-blue-600",
      tab: "users",
    },
    {
      title: "Administradores",
      value: stats?.roleCount.admin || 0,
      description: "Usuários com acesso admin",
      icon: Shield,
      color: "text-purple-600",
      tab: "users",
    },
    {
      title: "Assessores",
      value: stats?.roleCount.assessor || 0,
      description: "Usuários com perfil assessor",
      icon: UserCheck,
      color: "text-green-600",
      tab: "users",
    },
    {
      title: "Clientes",
      value: stats?.roleCount.cliente || 0,
      description: "Usuários clientes",
      icon: Users,
      color: "text-orange-600",
      tab: "users",
    },
    {
      title: "Novos Usuários (30 dias)",
      value: stats?.recentUsers || 0,
      description: "Cadastrados nos últimos 30 dias",
      icon: UserCheck,
      color: "text-green-600",
      tab: "users",
    },
    {
      title: "Contas Inativas",
      value: stats?.inactiveAccounts || 0,
      description: "Contas desativadas",
      icon: AlertCircle,
      color: stats?.inactiveAccounts ? "text-red-600" : "text-gray-600",
      tab: "users",
    },
    {
      title: "Convites Pendentes",
      value: stats?.pendingInvitations || 0,
      description: "Aguardando aceitação",
      icon: Users,
      color: "text-yellow-600",
      tab: "invitations",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index}
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
              onClick={() => onNavigateToTab?.(stat.tab)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats && stats.inactiveAccounts > 0 && (
        <Card className="mt-6 border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <AlertCircle className="h-5 w-5" />
              Atenção: Contas Inativas
            </CardTitle>
            <CardDescription className="text-yellow-800 dark:text-yellow-200">
              Existem {stats.inactiveAccounts} conta(s) inativa(s) na plataforma. 
              Revise a lista de usuários para verificar se alguma ação é necessária.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};
