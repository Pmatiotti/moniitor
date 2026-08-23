import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Building2, Search } from "lucide-react";
import { AddOrganizationDialog } from "./AddOrganizationDialog";
import { OrganizationDetailsDialog } from "./OrganizationDetailsDialog";
import { useToast } from "@/hooks/use-toast";

export const OrganizationsManager = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<any>(null);
  const { toast } = useToast();

  const { data: organizations, refetch } = useQuery({
    queryKey: ['organizations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations' as any)
        .select(`
          *,
          user_roles(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const filteredOrganizations = organizations?.filter((org: any) =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleStatus = async (orgId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('organizations' as any)
      .update({ is_active: !currentStatus })
      .eq('id', orgId);

    if (error) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status atualizado!",
        description: `Escritório ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Escritórios</h2>
          <p className="text-muted-foreground">
            Gerencie escritórios e emails autorizados
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Escritório
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, CNPJ ou código..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrganizations?.map((org: any) => (
          <Card
            key={org.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedOrg(org)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Building2 className="h-8 w-8 text-primary" />
                <Badge variant={org.is_active ? "default" : "secondary"}>
                  {org.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <CardTitle className="mt-4">{org.name}</CardTitle>
              <CardDescription>
                {org.cnpj && `CNPJ: ${org.cnpj}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-medium">{org.slug}</span>
                </div>
                {org.contact_email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium truncate ml-2">{org.contact_email}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-muted-foreground">Usuários:</span>
                  <Badge variant="outline">
                    {org.user_roles?.[0]?.count || 0}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredOrganizations?.length === 0 && (
        <Card className="p-8 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum escritório encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "Tente ajustar sua busca"
              : "Comece adicionando um novo escritório"}
          </p>
          {!searchTerm && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Escritório
            </Button>
          )}
        </Card>
      )}

      <AddOrganizationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={() => {
          refetch();
          setAddDialogOpen(false);
        }}
      />

      <OrganizationDetailsDialog
        organization={selectedOrg}
        open={!!selectedOrg}
        onOpenChange={(open) => !open && setSelectedOrg(null)}
        onSuccess={refetch}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
};
