import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileUp, RefreshCw, Pencil, Trash2, ChevronDown, ChevronUp, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Plus, PlusCircle, TrendingUp, Loader2, BarChart3 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImportClientPortfolioDialog } from "./ImportClientPortfolioDialog";
import { EditClientAssetDialog } from "./EditClientAssetDialog";
import { AddClientAssetDialog } from "./AddClientAssetDialog";
import { inferSubClass, inferFixedIncomeSubClass } from "@/lib/subclass-inference";
import { FundamentalDataCard } from "@/components/portfolio/FundamentalDataCard";
import { AddContributionDialog } from "@/components/portfolio/AddContributionDialog";
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

interface Asset {
  id: string;
  ticker: string;
  asset_name: string;
  asset_class: string;
  sub_class: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
  currency: string | null;
  broker: string | null;
  invested_amount: number | null;
  rate: string | null;
  maturity_date: string | null;
}

interface ClientPortfolioViewProps {
  clientId: string;
  clientName: string;
  onPortfolioUpdate?: () => void;
}

type SortField = 'ticker' | 'asset_name' | 'asset_class' | 'sub_class' | 'broker' | 'quantity' | 'totalValue' | 'profitLoss';
type SortDirection = 'asc' | 'desc' | null;

export const ClientPortfolioView = ({ clientId, clientName, onPortfolioUpdate }: ClientPortfolioViewProps) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addAssetDialogOpen, setAddAssetDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [updatingPrices, setUpdatingPrices] = useState(false);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [contributionAsset, setContributionAsset] = useState<Asset | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssets();
  }, [clientId]);

  const calculateTotalValue = (assetsList: Asset[]) => {
    return assetsList.reduce((sum, asset) => {
      const isFixedValueAsset = 
        (asset.asset_class === "Renda Fixa" || 
         asset.asset_class === "COE" || 
         asset.asset_class === "Fundos de Investimento" ||
         asset.asset_class === "Multimercado") && 
        Number(asset.quantity) === 1;
      
      const value = isFixedValueAsset 
        ? Number(asset.current_price) 
        : Number(asset.current_price) * Number(asset.quantity);
      return sum + value;
    }, 0);
  };

  const getAssetTotalValue = (asset: Asset) => {
    const isFixedValueAsset = 
      (asset.asset_class === "Renda Fixa" || 
       asset.asset_class === "COE" || 
       asset.asset_class === "Fundos de Investimento" ||
       asset.asset_class === "Multimercado") && 
      Number(asset.quantity) === 1;
    
    return isFixedValueAsset 
      ? Number(asset.current_price) 
      : Number(asset.current_price) * Number(asset.quantity);
  };

  const getAssetProfitLossPercent = (asset: Asset) => {
    const totalValue = getAssetTotalValue(asset);
    
    const isFixedValueAsset = 
      (asset.asset_class === "Renda Fixa" || 
       asset.asset_class === "COE" || 
       asset.asset_class === "Fundos de Investimento" ||
       asset.asset_class === "Multimercado") && 
      Number(asset.quantity) === 1;

    let totalCost: number;
    if (asset.invested_amount && Number(asset.invested_amount) > 0) {
      totalCost = Number(asset.invested_amount);
    } else if (isFixedValueAsset) {
      // Para ativos de valor fixo (qty=1), average_price já é o montante total investido
      totalCost = Number(asset.average_price);
    } else {
      totalCost = Number(asset.average_price) * Number(asset.quantity);
    }
    
    return totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 inline opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="ml-1 h-3 w-3 inline text-primary" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3 inline text-primary" />;
  };

  const sortedAssets = useMemo(() => {
    if (!sortField || !sortDirection) return assets;
    
    return [...assets].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'ticker':
          comparison = a.ticker.localeCompare(b.ticker);
          break;
        case 'asset_name':
          comparison = a.asset_name.localeCompare(b.asset_name);
          break;
        case 'asset_class':
          comparison = a.asset_class.localeCompare(b.asset_class);
          break;
        case 'sub_class':
          const aSubClass = a.asset_class === 'Renda Fixa' 
            ? inferFixedIncomeSubClass(a.rate, a.asset_name) || ''
            : a.sub_class || inferSubClass(a.asset_class, a.asset_name, a.ticker, a.rate) || '';
          const bSubClass = b.asset_class === 'Renda Fixa' 
            ? inferFixedIncomeSubClass(b.rate, b.asset_name) || ''
            : b.sub_class || inferSubClass(b.asset_class, b.asset_name, b.ticker, b.rate) || '';
          comparison = aSubClass.localeCompare(bSubClass);
          break;
        case 'broker':
          comparison = (a.broker || '').localeCompare(b.broker || '');
          break;
        case 'quantity':
          comparison = Number(a.quantity) - Number(b.quantity);
          break;
        case 'totalValue':
          comparison = getAssetTotalValue(a) - getAssetTotalValue(b);
          break;
        case 'profitLoss':
          comparison = getAssetProfitLossPercent(a) - getAssetProfitLossPercent(b);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [assets, sortField, sortDirection]);

  const updateClientPortfolioValue = async (assetsList: Asset[]) => {
    try {
      const totalValue = calculateTotalValue(assetsList);
      
      await supabase
        .from("clients")
        .update({ 
          portfolio_value: totalValue,
          last_portfolio_update: new Date().toISOString()
        })
        .eq("id", clientId);
        
      if (onPortfolioUpdate) {
        onPortfolioUpdate();
      }
    } catch (error) {
      console.error("Error updating client portfolio value:", error);
    }
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("client_id", clientId)
        .order("ticker");

      if (error) throw error;
      
      if (data && data.length > 0) {
        const finalAssets = (data as any) || [];
        setAssets(finalAssets);
        await updateClientPortfolioValue(finalAssets);
        return;
      }
      
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("user_id")
        .eq("id", clientId)
        .maybeSingle();

      if (clientData?.user_id) {
        const { data: userAssets, error: userAssetsError } = await supabase
          .from("assets")
          .select("*")
          .eq("user_id", clientData.user_id)
          .is("client_id", null);

        if (!userAssetsError && userAssets && userAssets.length > 0) {
          const assetIds = userAssets.map((a: any) => a.id);
          await supabase
            .from("assets")
            .update({ client_id: clientId })
            .in("id", assetIds);

          const { data: updatedAssets } = await supabase
            .from("assets")
            .select("*")
            .eq("client_id", clientId)
            .order("ticker");

          const finalAssets = (updatedAssets as any) || [];
          setAssets(finalAssets);
          await updateClientPortfolioValue(finalAssets);
          
          toast({
            title: "Portfolio vinculado!",
            description: `${assetIds.length} ativo(s) foram vinculados ao cliente.`,
          });
          return;
        }
      } else {
        const { data: linkedUserAssets, error: linkedError } = await supabase
          .from("assets")
          .select("*")
          .eq("user_id", clientId)
          .order("ticker");

        if (!linkedError && linkedUserAssets && linkedUserAssets.length > 0) {
          setAssets(linkedUserAssets as any);
          setLoading(false);
          return;
        }
      }
      
      setAssets([]);
    } catch (error) {
      console.error("Error fetching client assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAssets();
  };

  const handleUpdatePrices = async () => {
    setUpdatingPrices(true);
    try {
      console.log("[CRM] Calling update-crm-client-prices for clientId:", clientId);
      
      const { data, error } = await supabase.functions.invoke("update-crm-client-prices", {
        body: { clientId }
      });

      console.log("[CRM] Response:", { data, error });

      if (error) {
        console.error("[CRM] Function error:", error);
        throw error;
      }

      // Verify data exists and has expected format
      if (!data || typeof data.updated === 'undefined') {
        console.error("[CRM] Invalid response format:", data);
        throw new Error(data?.error || "Resposta inválida do servidor");
      }

      if (data.updated > 0) {
        toast({
          title: "Cotações atualizadas!",
          description: `${data.updated} de ${data.total} ativo(s) foram atualizados.`,
        });
        await fetchAssets();
      } else {
        toast({
          title: "Nenhuma atualização",
          description: data.message || "Não há ativos elegíveis para atualização de cotação.",
        });
      }
    } catch (error: any) {
      console.error("[CRM] Update prices error:", error);
      toast({
        title: "Erro ao atualizar cotações",
        description: error.message || "Erro desconhecido ao atualizar cotações",
        variant: "destructive",
      });
    } finally {
      setUpdatingPrices(false);
    }
  };

  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("assets")
        .delete()
        .eq("id", selectedAsset.id);
      
      if (error) throw error;
      
      toast({
        title: "Ativo excluído",
        description: `${selectedAsset.ticker} foi removido do portfólio.`,
      });
      
      setDeleteConfirmOpen(false);
      setSelectedAsset(null);
      await fetchAssets();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const { error } = await supabase
        .from("assets")
        .delete()
        .in("id", idsToDelete);
      
      if (error) throw error;
      
      toast({
        title: "Ativos excluídos",
        description: `${idsToDelete.length} ativo(s) foram removidos do portfólio.`,
      });
      
      setBulkDeleteConfirmOpen(false);
      setSelectedIds(new Set());
      await fetchAssets();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === assets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assets.map(a => a.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const formatCurrency = (value: number, currency: string | null) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(value);
  };

  const totalValue = calculateTotalValue(assets);
  const brokers = [...new Set(assets.map(a => a.broker).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold">Portfólio de {clientName}</h3>
            <p className="text-muted-foreground">Posições consolidadas de todas as corretoras</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleUpdatePrices} variant="outline" disabled={updatingPrices}>
              {updatingPrices ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <TrendingUp className="mr-2 h-4 w-4" />
              )}
              Atualizar Cotações
            </Button>
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button onClick={() => setAddAssetDialogOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Ativo
            </Button>
            <Button onClick={() => setImportDialogOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" />
              Importar Posição
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Patrimônio Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalValue, 'BRL')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assets.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Corretoras</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{brokers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {brokers.slice(0, 2).join(", ")}{brokers.length > 2 ? "..." : ""}
              </p>
            </CardContent>
          </Card>
        </div>

        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  <CardTitle className="text-base">
                    Posições ({assets.length})
                  </CardTitle>
                </div>
              </CollapsibleTrigger>
              {selectedIds.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setBulkDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir {selectedIds.size} selecionado(s)
                </Button>
              )}
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {assets.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Nenhum ativo importado ainda.</p>
                    <Button 
                      onClick={() => setImportDialogOpen(true)} 
                      className="mt-4"
                      variant="outline"
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Importar Primeira Posição
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">
                          <Checkbox 
                            checked={assets.length > 0 && selectedIds.size === assets.length}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Selecionar todos"
                          />
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('ticker')}
                        >
                          Ticker {getSortIcon('ticker')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('asset_name')}
                        >
                          Nome {getSortIcon('asset_name')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('asset_class')}
                        >
                          Classe {getSortIcon('asset_class')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('sub_class')}
                        >
                          Subclasse {getSortIcon('sub_class')}
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('broker')}
                        >
                          Corretora {getSortIcon('broker')}
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('quantity')}
                        >
                          Quantidade {getSortIcon('quantity')}
                        </TableHead>
                        <TableHead className="text-right">Preço Médio</TableHead>
                        <TableHead className="text-right">Preço Atual</TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('totalValue')}
                        >
                          Valor Total {getSortIcon('totalValue')}
                        </TableHead>
                        <TableHead 
                          className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleSort('profitLoss')}
                        >
                          L/P % {getSortIcon('profitLoss')}
                        </TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedAssets.map((asset) => {
                        const isFixedValueAsset = 
                          (asset.asset_class === "Renda Fixa" || 
                           asset.asset_class === "COE" || 
                           asset.asset_class === "Fundos de Investimento" ||
                           asset.asset_class === "Multimercado") && 
                          Number(asset.quantity) === 1;
                        
                        const pricePerUnit = isFixedValueAsset 
                          ? Number(asset.current_price) / Number(asset.quantity)
                          : Number(asset.current_price);
                          
                        const totalValue = getAssetTotalValue(asset);
                        const profitLossPercent = getAssetProfitLossPercent(asset);

                        const canShowFundamentals = ["Renda Variável", "Ações", "FIIs"].includes(asset.asset_class);
                        const isAssetExpanded = expandedAssetId === asset.id;

                        return (
                          <>
                            <TableRow key={asset.id} className={`${selectedIds.has(asset.id) ? "bg-muted/50" : ""} ${canShowFundamentals ? "cursor-pointer" : ""}`}
                              onClick={() => {
                                if (canShowFundamentals) {
                                  setExpandedAssetId(isAssetExpanded ? null : asset.id);
                                }
                              }}
                            >
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox 
                                checked={selectedIds.has(asset.id)}
                                onCheckedChange={() => toggleSelectOne(asset.id)}
                                aria-label={`Selecionar ${asset.ticker}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-1">
                                {canShowFundamentals && (
                                  isAssetExpanded 
                                    ? <ChevronDown className="h-4 w-4 text-primary" />
                                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                {asset.ticker}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                {asset.asset_name}
                                {asset.rate && (
                                  <div className="text-xs text-muted-foreground">
                                    Taxa: {asset.rate}
                                  </div>
                                )}
                                {asset.maturity_date && (
                                  <div className="text-xs text-muted-foreground">
                                    Venc: {new Date(asset.maturity_date).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{asset.asset_class}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {asset.asset_class === 'Renda Fixa' 
                                ? inferFixedIncomeSubClass(asset.rate, asset.asset_name) || '-'
                                : asset.sub_class || inferSubClass(asset.asset_class, asset.asset_name, asset.ticker, asset.rate) || '-'}
                            </TableCell>
                            <TableCell>{asset.broker || '-'}</TableCell>
                            <TableCell className="text-right">{Number(asset.quantity).toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(Number(asset.average_price), asset.currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(pricePerUnit, asset.currency)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(totalValue, asset.currency)}</TableCell>
                            <TableCell className={`text-right ${profitLossPercent >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Registrar aporte"
                                  onClick={() => {
                                    setContributionAsset(asset);
                                    setContributionDialogOpen(true);
                                  }}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => {
                                    setSelectedAsset(asset);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isAssetExpanded && canShowFundamentals && (
                            <TableRow key={`${asset.id}-expanded`}>
                              <TableCell colSpan={12} className="bg-muted/30 p-4">
                                <FundamentalDataCard 
                                  ticker={asset.ticker} 
                                  assetClass={asset.asset_class} 
                                  currency={asset.currency || 'BRL'} 
                                />
                              </TableCell>
                            </TableRow>
                          )}
                          </>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      <ImportClientPortfolioDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        clientId={clientId}
        clientName={clientName}
        onSuccess={handleRefresh}
      />

      <AddClientAssetDialog
        open={addAssetDialogOpen}
        onOpenChange={setAddAssetDialogOpen}
        clientId={clientId}
        onSuccess={fetchAssets}
      />

      <EditClientAssetDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        asset={selectedAsset}
        clientId={clientId}
        onSuccess={fetchAssets}
      />

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedAsset?.ticker}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O ativo será removido permanentemente do portfólio do cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAsset}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddContributionDialog
        open={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
        asset={contributionAsset}
        onSuccess={fetchAssets}
      />

      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedIds.size} ativo(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os ativos selecionados serão removidos permanentemente do portfólio do cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : `Excluir ${selectedIds.size} ativo(s)`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
