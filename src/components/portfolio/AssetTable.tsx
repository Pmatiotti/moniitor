import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Pencil, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Briefcase, LineChart, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Asset } from "@/pages/Portfolio";
import { useState, useMemo } from "react";
import { AddDividendDialog } from "./AddDividendDialog";
import { AddContributionDialog } from "./AddContributionDialog";
import { FundamentalDataCard } from "./FundamentalDataCard";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetEvolutionDialog } from "./AssetEvolutionDialog";

type SortField = 'ticker' | 'asset_name' | 'asset_class' | 'sub_class' | 'quantity' | 'average_price' | 'current_price' | 'totalValue' | 'profitLoss';
type SortDirection = 'asc' | 'desc' | null;

interface AssetTableProps {
  assets: Asset[];
  onRefresh: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onEditAsset: (asset: Asset) => void;
  onAddAsset?: () => void;
  onUploadFile?: () => void;
}

export const AssetTable = ({ assets, onRefresh, selectedIds, onSelectionChange, onEditAsset, onAddAsset, onUploadFile }: AssetTableProps) => {
  const { toast } = useToast();
  const [dividendDialogOpen, setDividendDialogOpen] = useState(false);
  const [selectedAssetForDividend, setSelectedAssetForDividend] = useState<Asset | null>(null);
  const [evolutionDialogOpen, setEvolutionDialogOpen] = useState(false);
  const [selectedAssetForEvolution, setSelectedAssetForEvolution] = useState<Asset | null>(null);
  const [contributionDialogOpen, setContributionDialogOpen] = useState(false);
  const [selectedAssetForContribution, setSelectedAssetForContribution] = useState<Asset | null>(null);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Ativo removido",
        description: "O ativo foi removido da sua carteira.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao remover ativo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === assets.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(assets.map(a => a.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(sid => sid !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const handleAddDividend = (asset: Asset) => {
    setSelectedAssetForDividend(asset);
    setDividendDialogOpen(true);
  };

  const handleShowEvolution = (asset: Asset) => {
    setSelectedAssetForEvolution(asset);
    setEvolutionDialogOpen(true);
  };

  const canShowEvolution = (assetClass: string) => {
    return assetClass === "Renda Fixa";
  };

  const handleToggleExpand = (assetId: string) => {
    setExpandedAssetId(expandedAssetId === assetId ? null : assetId);
  };

  const canAddDividend = (assetClass: string) => {
    return assetClass === "Ações" || assetClass === "FIIs";
  };

  const formatCurrency = (value: number, currency: string | null) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(value);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 ml-1 inline text-primary" />;
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-4 w-4 ml-1 inline text-primary" />;
    }
    return <ArrowUpDown className="h-4 w-4 ml-1 inline opacity-50" />;
  };

  const sortedAssets = useMemo(() => {
    if (!sortField || !sortDirection) return assets;

    return [...assets].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Calculate values considering invested_amount logic
      const aUsesInvestedAmount = (a.asset_class === "Renda Fixa" || a.asset_class === "Multimercado") && 
                                  a.invested_amount && Number(a.invested_amount) > 0;
      const bUsesInvestedAmount = (b.asset_class === "Renda Fixa" || b.asset_class === "Multimercado") && 
                                  b.invested_amount && Number(b.invested_amount) > 0;

      switch (sortField) {
        case 'ticker':
          aValue = a.ticker.toLowerCase();
          bValue = b.ticker.toLowerCase();
          break;
        case 'asset_name':
          aValue = a.asset_name.toLowerCase();
          bValue = b.asset_name.toLowerCase();
          break;
        case 'asset_class':
          aValue = a.asset_class.toLowerCase();
          bValue = b.asset_class.toLowerCase();
          break;
        case 'sub_class':
          aValue = (a.sub_class || '').toLowerCase();
          bValue = (b.sub_class || '').toLowerCase();
          break;
        case 'quantity':
          aValue = Number(a.quantity);
          bValue = Number(b.quantity);
          break;
        case 'average_price':
          aValue = Number(a.average_price);
          bValue = Number(b.average_price);
          break;
        case 'current_price':
          aValue = Number(a.current_price);
          bValue = Number(b.current_price);
          break;
        case 'totalValue':
          aValue = Number(a.current_price) * Number(a.quantity);
          bValue = Number(b.current_price) * Number(b.quantity);
          break;
        case 'profitLoss':
          const aTotalValue = Number(a.current_price) * Number(a.quantity);
          const aTotalCost = aUsesInvestedAmount 
            ? Number(a.invested_amount) 
            : Number(a.average_price) * Number(a.quantity);
          const bTotalValue = Number(b.current_price) * Number(b.quantity);
          const bTotalCost = bUsesInvestedAmount 
            ? Number(b.invested_amount) 
            : Number(b.average_price) * Number(b.quantity);
          aValue = aTotalValue - aTotalCost;
          bValue = bTotalValue - bTotalCost;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [assets, sortField, sortDirection]);

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Sua carteira está vazia"
        description="Adicione seus primeiros ativos manualmente ou importe um arquivo CSV/PDF da sua corretora."
        actionLabel={onAddAsset ? "Adicionar Ativo" : undefined}
        onAction={onAddAsset}
        secondaryActionLabel={onUploadFile ? "Importar Arquivo" : undefined}
        onSecondaryAction={onUploadFile}
      />
    );
  }

  return (
    <>
      <AddDividendDialog
        open={dividendDialogOpen}
        onOpenChange={setDividendDialogOpen}
        onSuccess={onRefresh}
        asset={selectedAssetForDividend}
      />
      <AssetEvolutionDialog
        open={evolutionDialogOpen}
        onOpenChange={setEvolutionDialogOpen}
        asset={selectedAssetForEvolution}
      />
      <AddContributionDialog
        open={contributionDialogOpen}
        onOpenChange={setContributionDialogOpen}
        asset={selectedAssetForContribution}
        onSuccess={onRefresh}
      />
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <Checkbox 
              checked={selectedIds.length === assets.length && assets.length > 0}
              onCheckedChange={handleSelectAll}
            />
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('ticker')}
          >
            Ticker
            {getSortIcon('ticker')}
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('asset_name')}
          >
            Nome
            {getSortIcon('asset_name')}
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('asset_class')}
          >
            Classe
            {getSortIcon('asset_class')}
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('sub_class')}
          >
            Subclasse
            {getSortIcon('sub_class')}
          </TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('quantity')}
          >
            Quantidade
            {getSortIcon('quantity')}
          </TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('average_price')}
          >
            Preço Médio
            {getSortIcon('average_price')}
          </TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('current_price')}
          >
            Preço Atual
            {getSortIcon('current_price')}
          </TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('totalValue')}
          >
            Valor Total
            {getSortIcon('totalValue')}
          </TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => handleSort('profitLoss')}
          >
            Lucro/Prejuízo
            {getSortIcon('profitLoss')}
          </TableHead>
          <TableHead className="text-center">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedAssets.map((asset) => {
          // Para Renda Fixa e Fundos com invested_amount, usar esse valor ao invés do cálculo padrão
          const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                                     asset.invested_amount && Number(asset.invested_amount) > 0;
          
          // Para fundos/RF: current_price é o valor total da posição
          // Para ações/FIIs: current_price é o preço unitário
          // Para RF com invested_amount, mostrar valor total ao invés de preço unitário
          const displayPrice = Number(asset.current_price);
          const totalValue = Number(asset.current_price) * Number(asset.quantity);
            
          const totalCost = usesInvestedAmount ? Number(asset.invested_amount) : Number(asset.average_price) * Number(asset.quantity);
          const profitLoss = totalValue - totalCost;
          const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;
          const isExpanded = expandedAssetId === asset.id;
          const canShowFundamentals = asset.asset_class === "Renda Variável" || asset.asset_class === "FIIs" || asset.asset_class === "Ações";

          return (
            <>
              <TableRow key={asset.id}>
                <TableCell>
                  <Checkbox 
                    checked={selectedIds.includes(asset.id)}
                    onCheckedChange={() => handleSelectOne(asset.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {asset.ticker}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => canShowFundamentals && handleToggleExpand(asset.id)}
                    className={`text-left w-full ${canShowFundamentals ? 'hover:underline cursor-pointer text-primary' : ''} flex items-center gap-2`}
                    disabled={!canShowFundamentals}
                  >
                    {canShowFundamentals && (
                      isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                    <div>
                      {asset.asset_name}
                      {asset.rate && (
                        <div className="text-xs text-muted-foreground">Taxa: {asset.rate}</div>
                      )}
                      {asset.maturity_date && (
                        <div className="text-xs text-muted-foreground">
                          Venc: {new Date(asset.maturity_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </button>
                </TableCell>
              <TableCell>{asset.asset_class}</TableCell>
              <TableCell>{asset.sub_class || '-'}</TableCell>
              <TableCell className="text-right">{Number(asset.quantity).toFixed(2)}</TableCell>
              <TableCell className="text-right">
                {usesInvestedAmount ? formatCurrency(Number(asset.invested_amount), asset.currency) : formatCurrency(Number(asset.average_price), asset.currency)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(displayPrice, asset.currency)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totalValue, asset.currency)}
                {asset.invested_amount && Number(asset.invested_amount) > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Aplicado: {formatCurrency(Number(asset.invested_amount), asset.currency)}
                  </div>
                )}
              </TableCell>
              <TableCell className={`text-right ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(profitLoss, asset.currency)} ({profitLossPercent.toFixed(2)}%)
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAssetForContribution(asset);
                      setContributionDialogOpen(true);
                    }}
                    title="Registrar aporte"
                  >
                    <PlusCircle className="h-4 w-4" />
                  </Button>
                  {canShowEvolution(asset.asset_class) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShowEvolution(asset)}
                      title="Ver evolução"
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                  )}
                  {canAddDividend(asset.asset_class) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAddDividend(asset)}
                      title="Adicionar provento"
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditAsset(asset)}
                    title="Editar ativo"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(asset.id)}
                    title="Excluir ativo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            
            {/* Linha expandida com dados fundamentalistas */}
            {isExpanded && canShowFundamentals && (
              <TableRow>
                <TableCell colSpan={11} className="bg-muted/30 p-6">
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
    </>
  );
};
