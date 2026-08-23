import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsersTable } from "@/components/admin/UsersTable";
import { AdvisorLinksTable } from "@/components/admin/AdvisorLinksTable";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { SendInvitationDialog } from "@/components/admin/SendInvitationDialog";
import { InvitationsTable } from "@/components/admin/InvitationsTable";
import { AuditLogsTable } from "@/components/admin/AuditLogsTable";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { EmailManagement } from "@/components/admin/EmailManagement";
import { PluggyAuditLogs } from "@/components/admin/PluggyAuditLogs";
import { SyncStatusPanel } from "@/components/admin/SyncStatusPanel";
import { AssetTaxonomyManager } from "@/components/admin/AssetTaxonomyManager";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Link, Mail, History, LayoutDashboard, Lock, Building2, RefreshCw, Layers } from "lucide-react";
import { OrganizationsManager } from "@/components/admin/OrganizationsManager";

const Admin = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Administração
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie usuários e permissões da plataforma
          </p>
        </div>

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Como administrador, você pode gerenciar os roles dos usuários, enviar convites e monitorar atividades.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-10">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="organizations">
              <Building2 className="h-4 w-4 mr-2" />
              Escritórios
            </TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="invitations">Convites</TabsTrigger>
            <TabsTrigger value="links">Vínculos</TabsTrigger>
            <TabsTrigger value="taxonomy">
              <Layers className="h-4 w-4 mr-2" />
              Taxonomia
            </TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="sync">
              <RefreshCw className="h-4 w-4 mr-2" />
              Sync
            </TabsTrigger>
            <TabsTrigger value="audit">Auditoria</TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Segurança
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <AdminDashboard onNavigateToTab={setActiveTab} />
          </TabsContent>

          <TabsContent value="organizations" className="space-y-4">
            <OrganizationsManager />
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Usuários da Plataforma</CardTitle>
                    <CardDescription>
                      Gerencie os roles e permissões de cada usuário
                    </CardDescription>
                  </div>
                  <AddUserDialog />
                </div>
              </CardHeader>
              <CardContent>
                <UsersTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Convites Enviados
                    </CardTitle>
                    <CardDescription>
                      Gerencie e monitore os convites para novos usuários
                    </CardDescription>
                  </div>
                  <SendInvitationDialog />
                </div>
              </CardHeader>
              <CardContent>
                <InvitationsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="links" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  Vínculos Cliente-Assessor
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie os vínculos entre clientes e assessores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdvisorLinksTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="taxonomy" className="space-y-4">
            <AssetTaxonomyManager />
          </TabsContent>

          <TabsContent value="emails" className="space-y-4">
            <EmailManagement />
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sincronizações do Sistema
                </CardTitle>
                <CardDescription>
                  Monitore e execute manualmente as sincronizações de dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SyncStatusPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Registro de Auditoria
                </CardTitle>
                <CardDescription>
                  Acompanhe todas as ações importantes realizadas na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuditLogsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <PluggyAuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Admin;
