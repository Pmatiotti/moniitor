import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AllocationChart } from "./AllocationChart";
import { RebalancingActions, RebalancingAction } from "./RebalancingActions";
import { GoalBasedRecommendations } from "./GoalBasedRecommendations";
import { RefreshCw, Save, Plus, X } from "lucide-react";
import { getColorsForData } from "@/lib/asset-colors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Asset {
  id: string;
  ticker: string;
  asset_name: string;
  asset_class: string;
  sub_class: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
  invested_amount?: number;
  currency?: string;
}

interface AllocationData {
  name: string;
  value: number;
  percentage: number;
}

const AVAILABLE_ASSET_CLASSES = [
  // Renda Fixa
  'Inflação',
  'Pré fixado',
  'Pós fixado',
  // Fundos
  'Multimercado',
  // Ações Brasil
  'Small Caps',
  'Mid Caps',
  'Large Caps',
  'Dividendos',
  // FIIs
  'Shoppings',
  'Lajes Corporativas',
  'Logística',
  'Agro',
  'Papel',
  'Híbrido',
  'Fundos de Fundos',
  // Exterior
  'Criptomoedas',
  'Bonds (USD)',
  'REITs (USD)',
  'Stocks (USD)',
];

export const RebalancingSimulator = () => {
  const { toast } = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [currentAllocation, setCurrentAllocation] = useState<AllocationData[]>([]);
  const [targetAllocation, setTargetAllocation] = useState<Record<string, number>>({});
  const [allSubClasses, setAllSubClasses] = useState<string[]>([]);
  const [newSubClass, setNewSubClass] = useState<string>("");
  const [actions, setActions] = useState<RebalancingAction[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSubClass, setSelectedSubClass] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchAssets();
    fetchTargetAllocations();
    fetchGoals();
  }, []);

  useEffect(() => {
    // Auto-calculate rebalancing when we have both current allocation and saved targets
    if (currentAllocation.length > 0 && Object.keys(targetAllocation).length > 0) {
      const hasValidTargets = Object.values(targetAllocation).some(val => val > 0);
      if (hasValidTargets) {
        calculateRebalancing();
      }
    }
  }, [currentAllocation]);

  const fetchAssets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .eq("user_id", user.id)
        .is("client_id", null); // Excluir ativos de clientes

      if (error) throw error;

      if (data && data.length > 0) {
        setAssets(data);
        calculateCurrentAllocation(data);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast({
        title: "Erro ao carregar ativos",
        description: "Não foi possível carregar seus ativos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGoals = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "in_progress");

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const fetchTargetAllocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("target_allocations")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      if (data && data.length > 0) {
        const targets = data.reduce((acc, item) => {
          acc[item.sub_class] = Number(item.target_percentage);
          return acc;
        }, {} as Record<string, number>);
        setTargetAllocation(targets);
        
        // Set all sub classes from saved targets
        const savedClasses = data.map(item => item.sub_class);
        setAllSubClasses(savedClasses);
      }
    } catch (error) {
      console.error("Error fetching target allocations:", error);
    }
  };

  const saveTargetAllocations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const totalTarget = Object.values(targetAllocation).reduce((sum, val) => sum + val, 0);

      if (Math.abs(totalTarget - 100) > 0.1) {
        toast({
          title: "Erro na alocação alvo",
          description: "A soma das porcentagens deve ser 100%.",
          variant: "destructive",
        });
        return;
      }

      // Delete existing allocations
      await supabase
        .from("target_allocations")
        .delete()
        .eq("user_id", user.id);

      // Insert new allocations
      const allocations = Object.entries(targetAllocation).map(([sub_class, target_percentage]) => ({
        user_id: user.id,
        sub_class,
        target_percentage,
      }));

      const { error } = await supabase
        .from("target_allocations")
        .insert(allocations);

      if (error) throw error;

      toast({
        title: "Alocação alvo salva",
        description: "Seus percentuais alvo foram salvos com sucesso.",
      });
    } catch (error) {
      console.error("Error saving target allocations:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a alocação alvo.",
        variant: "destructive",
      });
    }
  };

  const calculateCurrentAllocation = (assetList: Asset[]) => {
    // Calcular total considerando lógica de fundos/RF vs ações/FIIs
    let total = 0;
    
    assetList.forEach((asset) => {
      const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                                 asset.invested_amount && Number(asset.invested_amount) > 0;
      
      const assetValue = usesInvestedAmount 
        ? Number(asset.current_price) 
        : Number(asset.current_price) * Number(asset.quantity);
      
      total += assetValue;
    });
    
    setTotalValue(total);

    // Agrupar por subclasse de ativo (usa sub_class se existir, senão usa asset_class)
    const allocationBySubClass: Record<string, number> = {};
    
    assetList.forEach((asset) => {
      const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                                 asset.invested_amount && Number(asset.invested_amount) > 0;
      
      const assetValue = usesInvestedAmount 
        ? Number(asset.current_price) 
        : Number(asset.current_price) * Number(asset.quantity);
      
      // Usar sub_class se disponível, senão usar asset_class
      const subClass = asset.sub_class || asset.asset_class;
      
      if (allocationBySubClass[subClass]) {
        allocationBySubClass[subClass] += assetValue;
      } else {
        allocationBySubClass[subClass] = assetValue;
      }
    });

    const allocationData: AllocationData[] = Object.entries(allocationBySubClass).map(
      ([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      })
    );

    setCurrentAllocation(allocationData);

    // Only set initial classes from portfolio if no saved targets
    if (allSubClasses.length === 0) {
      const portfolioSubClasses = allocationData.map(item => item.name);
      setAllSubClasses(portfolioSubClasses);
    }
  };

  const handleTargetChange = (subClass: string, value: string) => {
    // Remove leading zeros and allow empty string
    const cleanedValue = value.replace(/^0+(?=\d)/, '');
    const numValue = cleanedValue === '' ? 0 : parseFloat(cleanedValue) || 0;
    setTargetAllocation({
      ...targetAllocation,
      [subClass]: numValue,
    });
  };

  const addSubClass = () => {
    if (!newSubClass) {
      toast({
        title: "Selecione uma subclasse",
        description: "Escolha uma subclasse de ativo para adicionar.",
        variant: "destructive",
      });
      return;
    }

    if (allSubClasses.includes(newSubClass)) {
      toast({
        title: "Subclasse já existe",
        description: "Esta subclasse de ativo já foi adicionada.",
        variant: "destructive",
      });
      return;
    }

    setAllSubClasses([...allSubClasses, newSubClass]);
    setTargetAllocation({
      ...targetAllocation,
      [newSubClass]: 0,
    });
    setNewSubClass("");
  };

  const removeSubClass = (subClass: string) => {
    // Check if this sub class has assets in the portfolio
    const hasAssets = currentAllocation.some(item => item.name === subClass);
    
    if (hasAssets) {
      toast({
        title: "Não é possível remover",
        description: "Esta subclasse possui ativos na carteira.",
        variant: "destructive",
      });
      return;
    }

    setAllSubClasses(allSubClasses.filter(c => c !== subClass));
    const newTargets = { ...targetAllocation };
    delete newTargets[subClass];
    setTargetAllocation(newTargets);
  };

  const calculateRebalancing = () => {
    const totalTarget = Object.values(targetAllocation).reduce((sum, val) => sum + val, 0);

    if (Math.abs(totalTarget - 100) > 0.1) {
      toast({
        title: "Erro na alocação alvo",
        description: "A soma das porcentagens deve ser 100%.",
        variant: "destructive",
      });
      return;
    }

    const rebalancingActions: RebalancingAction[] = allSubClasses.map((subClass) => {
      const current = currentAllocation.find(a => a.name === subClass);
      const currentValue = current?.value || 0;
      const targetPercentage = targetAllocation[subClass] || 0;
      const targetValue = (totalValue * targetPercentage) / 100;
      const difference = targetValue - currentValue;
      const percentageDiff = currentValue > 0 ? ((targetValue - currentValue) / currentValue) * 100 : 100;

      let action: 'buy' | 'sell' | 'hold' = 'hold';
      if (currentValue === 0 && targetValue > 0) {
        action = 'buy';
      } else if (currentValue > 0 && Math.abs(percentageDiff) > 5) {
        action = difference > 0 ? 'buy' : 'sell';
      }

      return {
        assetClass: subClass,
        currentValue,
        targetValue,
        difference,
        percentageDiff,
        action,
        suggestedAmount: Math.abs(difference),
      };
    });

    setActions(rebalancingActions.filter(a => a.action !== 'hold'));
  };

  const handleSliceClick = (subClass: string) => {
    setSelectedSubClass(subClass);
    setDetailDialogOpen(true);
  };

  const getAssetsBySubClass = (subClass: string) => {
    return assets.filter(asset => {
      const assetSubClass = asset.sub_class || asset.asset_class;
      return assetSubClass === subClass;
    });
  };

  const formatCurrency = (value: number, currency: string | null = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency || 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const availableToAdd = AVAILABLE_ASSET_CLASSES.filter(
    ac => !allSubClasses.includes(ac)
  );

  return (
    <div className="space-y-6">
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhamento: {selectedSubClass}</DialogTitle>
          </DialogHeader>
          {selectedSubClass && (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Preço Atual</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">% da Subclasse</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {getAssetsBySubClass(selectedSubClass).map((asset) => {
                    const usesInvestedAmount = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                                               asset.invested_amount && Number(asset.invested_amount) > 0;
                    
                    const assetValue = usesInvestedAmount 
                      ? Number(asset.current_price) 
                      : Number(asset.current_price) * Number(asset.quantity);
                    
                    const subClassTotal = currentAllocation.find(a => a.name === selectedSubClass)?.value || 1;
                    const percentOfSubClass = (assetValue / subClassTotal) * 100;

                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.ticker}</TableCell>
                        <TableCell>{asset.asset_name}</TableCell>
                        <TableCell className="text-right">{Number(asset.quantity).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(Number(asset.current_price), asset.currency)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(assetValue, asset.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          {percentOfSubClass.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="font-semibold">Total da Subclasse:</span>
                <span className="text-xl font-bold">
                  {formatCurrency(currentAllocation.find(a => a.name === selectedSubClass)?.value || 0)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {actions.length > 0 && <RebalancingActions actions={actions} />}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <AllocationChart
              data={currentAllocation}
              title="Alocação Atual por Subclasse"
              colors={getColorsForData(currentAllocation)}
              onSliceClick={handleSliceClick}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alocação Alvo por Subclasse (%)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {allSubClasses.map((subClass) => {
              const hasAssets = currentAllocation.some(item => item.name === subClass);
              return (
                <div key={subClass} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={subClass}>{subClass}</Label>
                    {!hasAssets && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSubClass(subClass)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id={subClass}
                      type="number"
                      step="0.1"
                      value={targetAllocation[subClass] || ''}
                      onChange={(e) => handleTargetChange(subClass, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="0"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>
              );
            })}
            
            {availableToAdd.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <Label>Adicionar Subclasse de Ativo</Label>
                <div className="flex gap-2">
                  <Select value={newSubClass} onValueChange={setNewSubClass}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableToAdd.map((ac) => (
                        <SelectItem key={ac} value={ac}>
                          {ac}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addSubClass} size="icon" variant="outline">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="pt-4 border-t space-y-2">
              <div className="flex justify-between items-center mb-4">
                <span className="font-medium">Total:</span>
                <span className={`font-bold ${
                  Math.abs(Object.values(targetAllocation).reduce((s, v) => s + v, 0) - 100) < 0.1
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  {Object.values(targetAllocation).reduce((s, v) => s + v, 0).toFixed(1)}%
                </span>
              </div>
              <Button onClick={saveTargetAllocations} className="w-full" variant="outline">
                <Save className="mr-2 h-4 w-4" />
                Salvar Alocação Alvo
              </Button>
              <Button onClick={calculateRebalancing} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Calcular Rebalanceamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <GoalBasedRecommendations totalValue={totalValue} goals={goals} />
    </div>
  );
};
