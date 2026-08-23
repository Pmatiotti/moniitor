import { useEffect, useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, FileDown, RefreshCw, Trash2, Pencil, Link2, TrendingUp, Briefcase } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AddAssetDialog } from "@/components/portfolio/AddAssetDialog";
import { UploadFileDialog } from "@/components/portfolio/UploadFileDialog";
import { EditAssetDialog } from "@/components/portfolio/EditAssetDialog";
import { BulkEditDialog } from "@/components/portfolio/BulkEditDialog";
import { AssetTable } from "@/components/portfolio/AssetTable";
import { PluggyInvestments } from "@/components/portfolio/PluggyInvestments";
import { AIQuickAction } from "@/components/ai/AIQuickAction";
import { generatePortfolioReport } from "@/lib/pdf-reports";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export interface Asset {
  id: string;
  ticker: string;
  asset_name: string;
  asset_class: string;
  sub_class?: string;
  quantity: number;
  average_price: number;
  current_price: number;
  currency: string;
  broker: string;
  sector: string;
  application_date?: string;
  maturity_date?: string;
  rate?: string;
  invested_amount?: number;
  cnpj?: string;
}

const Portfolio = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [updatingFundQuotes, setUpdatingFundQuotes] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [bulkEditDialogOpen, setBulkEditDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [viewTab, setViewTab] = useState<string>("geral");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [subClassFilter, setSubClassFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null) // Excluir ativos de clientes
        .order("ticker");

      if (error) throw error;
      
      // Force new array reference to trigger re-render
      setAssets([...(data || [])]);
      console.log(`✅ ${data?.length || 0} ativos carregados`);
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  };

  // Map view tabs to asset classes
  const getAssetClassForTab = (tab: string) => {
    switch(tab) {
      case "renda-variavel": return "Renda Variável";
      case "renda-fixa": return "Renda Fixa";
      case "fundos": return "Fundos de Investimento";
      case "previdencia": return "Previdência";
      default: return null;
    }
  };

  // Get unique classes for filter (only for "geral" view)
  const assetClasses = useMemo(() => {
    const classes = new Set(assets.map(a => a.asset_class).filter(Boolean));
    return Array.from(classes).sort();
  }, [assets]);

  // Get unique sub classes for filter (based on selected view tab and class filter)
  const subClasses = useMemo(() => {
    let assetsToFilter = assets;
    
    // For "geral" view, filter by selected class
    if (viewTab === "geral" && classFilter !== "all") {
      assetsToFilter = assets.filter(a => a.asset_class === classFilter);
    } else {
      // For other tabs, filter by tab's asset class
      const tabClassFilter = getAssetClassForTab(viewTab);
      if (tabClassFilter) {
        assetsToFilter = assets.filter(a => a.asset_class === tabClassFilter);
      }
    }
    
    const classes = new Set(
      assetsToFilter
        .map(a => a.sub_class)
        .filter(Boolean) as string[]
    );
    return Array.from(classes).sort();
  }, [assets, viewTab, classFilter]);

  // Filter assets by selected view tab, class filter, and subclass
  const filteredAssets = useMemo(() => {
    let filtered = assets;
    
    if (viewTab === "geral") {
      // For "geral" view, use class and subclass filters
      if (classFilter !== "all") {
        filtered = filtered.filter(a => a.asset_class === classFilter);
      }
    } else {
      // For other tabs, filter by tab's asset class
      const tabClassFilter = getAssetClassForTab(viewTab);
      if (tabClassFilter) {
        filtered = filtered.filter(a => a.asset_class === tabClassFilter);
      }
    }
    
    // Filter by subclass
    if (subClassFilter !== "all") {
      filtered = filtered.filter(a => a.sub_class === subClassFilter);
    }
    
    return filtered;
  }, [assets, viewTab, classFilter, subClassFilter]);

  // Reset filters when tab changes
  const handleTabChange = (value: string) => {
    setViewTab(value);
    setClassFilter("all");
    setSubClassFilter("all");
  };

  // Count assets by class
  const assetCounts = useMemo(() => {
    return {
      rendaVariavel: assets.filter(a => a.asset_class === "Renda Variável").length,
      rendaFixa: assets.filter(a => a.asset_class === "Renda Fixa").length,
      fundos: assets.filter(a => a.asset_class === "Fundos de Investimento").length,
      previdencia: assets.filter(a => a.asset_class === "Previdência").length,
    };
  }, [assets]);

  const handleUpdatePrices = async () => {
    setUpdatingPrices(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-portfolio-prices');
      
      if (error) throw error;
      
      if (data?.success) {
        toast({
          title: "Preços atualizados!",
          description: `${data.updated} ativo(s) atualizado(s) com sucesso. ${data.failed > 0 ? `${data.failed} falhou(aram).` : ''}`,
        });
        
        // Wait for database to finish processing
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh assets list with loading indicator
        await fetchAssets(true);
      } else {
        throw new Error(data?.error || 'Falha ao atualizar preços');
      }
    } catch (error: any) {
      console.error('Error updating prices:', error);
      toast({
        title: "Erro ao atualizar preços",
        description: error.message || "Não foi possível atualizar os preços.",
        variant: "destructive",
      });
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleUpdateFundQuotes = async () => {
    setUpdatingFundQuotes(true);
    try {
      // First fetch quotes from ANBIMA
      const { data: anbimaData, error: anbimaError } = await supabase.functions.invoke('fetch-anbima-fund-quotes');
      
      if (anbimaError) {
        console.warn('ANBIMA fetch warning:', anbimaError);
      }
      
      // Then update fund values
      const { data, error } = await supabase.functions.invoke('update-fund-values');
      
      if (error) throw error;
      
      if (data?.success) {
        const anbimaInfo = anbimaData?.fetched ? ` (${anbimaData.fetched} da ANBIMA)` : '';
        toast({
          title: "Cotas de fundos atualizadas!",
          description: `${data.updated} fundo(s) atualizado(s)${anbimaInfo}.`,
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        await fetchAssets(true);
      } else {
        throw new Error(data?.error || 'Falha ao atualizar cotas');
      }
    } catch (error: any) {
      console.error('Error updating fund quotes:', error);
      toast({
        title: "Erro ao atualizar cotas",
        description: error.message || "Não foi possível atualizar as cotas dos fundos.",
        variant: "destructive",
      });
    } finally {
      setUpdatingFundQuotes(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userName = user?.email || 'Usuário';
      
      generatePortfolioReport(assets, userName);
      
      toast({
        title: "Relatório gerado",
        description: "O relatório em PDF foi baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .in("id", selectedIds);

      if (error) throw error;

      toast({
        title: "Ativos removidos",
        description: `${selectedIds.length} ativo(s) removido(s) com sucesso.`,
      });
      
      setSelectedIds([]);
      await fetchAssets();
    } catch (error: any) {
      toast({
        title: "Erro ao remover ativos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const confirmDeleteAll = async () => {
    setDeletingAll(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Todos os ativos removidos",
        description: `${assets.length} ativo(s) excluído(s) da carteira.`,
      });
      
      setSelectedIds([]);
      setDeleteAllDialogOpen(false);
      await fetchAssets();
    } catch (error: any) {
      toast({
        title: "Erro ao remover ativos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingAll(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Carteira</h1>
            <p className="text-muted-foreground">Gerencie seus ativos e acompanhe sua performance</p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleUpdatePrices} 
              variant="outline" 
              disabled={assets.length === 0 || updatingPrices}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${updatingPrices ? 'animate-spin' : ''}`} />
              {updatingPrices ? 'Atualizando...' : 'Atualizar Preços'}
            </Button>
            <Button onClick={handleGeneratePDF} variant="outline" disabled={assets.length === 0}>
              <FileDown className="mr-2 h-4 w-4" />
              Gerar PDF
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)} variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Importar Arquivo
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Ativo
            </Button>
          </div>
        </div>

        <Tabs value={viewTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="geral">Geral ({assets.length})</TabsTrigger>
            <TabsTrigger value="renda-variavel">Renda Variável ({assetCounts.rendaVariavel})</TabsTrigger>
            <TabsTrigger value="renda-fixa">Renda Fixa ({assetCounts.rendaFixa})</TabsTrigger>
            <TabsTrigger value="fundos">Fundos de Investimento ({assetCounts.fundos})</TabsTrigger>
            <TabsTrigger value="previdencia">Previdência ({assetCounts.previdencia})</TabsTrigger>
            <TabsTrigger value="pluggy">
              <Link2 className="h-4 w-4 mr-2" />
              Integração Bancária
            </TabsTrigger>
          </TabsList>

          <TabsContent value={viewTab}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle>
                    {viewTab === "geral" && "Ativos da Carteira"}
                    {viewTab === "renda-variavel" && "Renda Variável"}
                    {viewTab === "renda-fixa" && "Renda Fixa"}
                    {viewTab === "fundos" && "Fundos de Investimento"}
                    {viewTab === "previdencia" && "Previdência"}
                  </CardTitle>
                  {viewTab === "geral" && assets.length > 0 && assetClasses.length > 0 && (
                    <Select value={classFilter} onValueChange={setClassFilter}>
                      <SelectTrigger className="w-[200px] bg-background">
                        <SelectValue placeholder="Filtrar por classe" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">Todas as Classes</SelectItem>
                        {assetClasses.map((assetClass) => (
                          <SelectItem key={assetClass} value={assetClass}>
                            {assetClass}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {assets.length > 0 && subClasses.length > 0 && (
                    <Select value={subClassFilter} onValueChange={setSubClassFilter}>
                      <SelectTrigger className="w-[200px] bg-background">
                        <SelectValue placeholder="Filtrar por subclasse" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">Todas as Subclasses</SelectItem>
                        {subClasses.map((subClass) => (
                          <SelectItem key={subClass} value={subClass}>
                            {subClass}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {viewTab === "fundos" && assetCounts.fundos > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdateFundQuotes}
                      disabled={updatingFundQuotes}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${updatingFundQuotes ? 'animate-spin' : ''}`} />
                      {updatingFundQuotes ? 'Sincronizando...' : 'Atualizar Cotas ANBIMA'}
                    </Button>
                  )}
                </div>
                {assets.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBulkEditDialogOpen(true)}
                      disabled={selectedIds.length === 0}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Editar em Massa ({selectedIds.length})
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelected}
                      disabled={selectedIds.length === 0}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Selecionados ({selectedIds.length})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteAllDialogOpen(true)}
                      className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir Todos
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <AssetTable 
                    assets={filteredAssets}
                    onRefresh={fetchAssets}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onEditAsset={(asset) => {
                      setEditingAsset(asset);
                      setEditDialogOpen(true);
                    }}
                    onAddAsset={() => setAddDialogOpen(true)}
                    onUploadFile={() => setUploadDialogOpen(true)}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pluggy">
            <PluggyInvestments />
          </TabsContent>
        </Tabs>

        {/* AI Quick Actions para Portfolio */}
        {assets.length > 0 && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Análises Inteligentes do Portfólio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <AIQuickAction
                  label="Analisar Alocação"
                  prompt={`Analise minha alocação de ativos atual (${assets.length} ativos) e sugira melhorias específicas para otimização`}
                  contextData={{ assets: assets.slice(0, 20) }}
                  variant="outline"
                />
                <AIQuickAction
                  label="Identificar Oportunidades"
                  prompt="Identifique oportunidades de compra ou venda no meu portfólio com base nas condições atuais do mercado"
                  contextData={{ assets: assets.slice(0, 20) }}
                  variant="outline"
                />
                <AIQuickAction
                  label="Avaliar Risco Total"
                  prompt="Avalie o nível de risco agregado do meu portfólio e sugira ajustes para o meu perfil"
                  contextData={{ assets: assets.slice(0, 20) }}
                  variant="outline"
                />
              </div>
            </CardContent>
        </Card>
        )}

        <AddAssetDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          onSuccess={fetchAssets}
        />

        <UploadFileDialog
          open={uploadDialogOpen}
          onOpenChange={setUploadDialogOpen}
          onSuccess={fetchAssets}
        />

        <EditAssetDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={fetchAssets}
          asset={editingAsset}
        />

        <BulkEditDialog
          open={bulkEditDialogOpen}
          onOpenChange={setBulkEditDialogOpen}
          onSuccess={() => {
            fetchAssets();
            setSelectedIds([]);
          }}
          selectedIds={selectedIds}
        />

        <ConfirmDialog
          open={deleteAllDialogOpen}
          onOpenChange={setDeleteAllDialogOpen}
          title="Excluir todos os ativos"
          description={`Tem certeza que deseja excluir TODOS os ${assets.length} ativos da carteira? Esta ação não pode ser desfeita.`}
          confirmLabel="Sim, excluir todos"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteAll}
          variant="destructive"
          loading={deletingAll}
        />
      </div>
    </AppLayout>
  );
};

export default Portfolio;
