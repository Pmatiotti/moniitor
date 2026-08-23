import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, Link2, Loader2, Search } from "lucide-react";

interface Asset {
  id: string;
  ticker: string;
  asset_name: string;
  asset_class: string;
  sub_class: string | null;
  current_price: number | null;
  quantity: number;
  invested_amount: number | null;
}

interface AssetAllocation {
  assetId: string;
  percentage: number;
}

interface AddGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddGoalDialog = ({ open, onOpenChange, onSuccess }: AddGoalDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [allocations, setAllocations] = useState<AssetAllocation[]>([]);
  const [showAssets, setShowAssets] = useState(false);
  const [assetSearch, setAssetSearch] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_amount: "",
    current_amount: "0",
    deadline: "",
    goal_type: "savings",
    priority: "3",
  });

  useEffect(() => {
    if (open) {
      fetchAssets();
    }
  }, [open]);

  const fetchAssets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("assets")
        .select("id, ticker, asset_name, asset_class, sub_class, current_price, quantity, invested_amount")
        .eq("user_id", user.id)
        .is("client_id", null) // Excluir ativos de clientes
        .order("asset_class", { ascending: true });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getAssetValue = (asset: Asset) => {
    const usesInvested = (asset.asset_class === 'Renda Fixa' || asset.asset_class === 'Multimercado') && 
                         asset.invested_amount && Number(asset.invested_amount) > 0;
    return usesInvested 
      ? Number(asset.current_price || 0) 
      : Number(asset.current_price || 0) * Number(asset.quantity);
  };

  const calculatedValue = useMemo(() => {
    return allocations.reduce((total, alloc) => {
      const asset = assets.find(a => a.id === alloc.assetId);
      if (!asset) return total;
      const assetValue = getAssetValue(asset);
      return total + (assetValue * (alloc.percentage / 100));
    }, 0);
  }, [allocations, assets]);

  const filteredAssets = useMemo(() => {
    if (!assetSearch) return assets;
    const search = assetSearch.toLowerCase();
    return assets.filter(a => 
      a.ticker.toLowerCase().includes(search) || 
      a.asset_name.toLowerCase().includes(search) ||
      a.asset_class.toLowerCase().includes(search)
    );
  }, [assets, assetSearch]);

  const groupedAssets = useMemo(() => {
    const groups: Record<string, Asset[]> = {};
    filteredAssets.forEach(asset => {
      if (!groups[asset.asset_class]) {
        groups[asset.asset_class] = [];
      }
      groups[asset.asset_class].push(asset);
    });
    return groups;
  }, [filteredAssets]);

  const handleAssetToggle = (assetId: string) => {
    const exists = allocations.find(a => a.assetId === assetId);
    if (exists) {
      setAllocations(allocations.filter(a => a.assetId !== assetId));
    } else {
      setAllocations([...allocations, { assetId, percentage: 100 }]);
    }
  };

  const handleAllocationChange = (assetId: string, percentage: number) => {
    setAllocations(allocations.map(a => 
      a.assetId === assetId ? { ...a, percentage } : a
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create goal
      const { data: goalData, error: goalError } = await supabase
        .from("financial_goals")
        .insert({
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          target_amount: parseFloat(formData.target_amount),
          current_amount: allocations.length > 0 ? calculatedValue : parseFloat(formData.current_amount),
          deadline: formData.deadline || null,
          goal_type: formData.goal_type,
          priority: parseInt(formData.priority),
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Create asset mappings if any
      if (allocations.length > 0) {
        const mappings = allocations.map(alloc => {
          const asset = assets.find(a => a.id === alloc.assetId);
          return {
            goal_id: goalData.id,
            asset_id: alloc.assetId,
            asset_class: asset?.asset_class,
            sub_class: asset?.sub_class,
            user_id: user.id,
            allocation_percentage: alloc.percentage,
          };
        });

        const { error: mappingError } = await supabase
          .from("goal_portfolio_mappings")
          .insert(mappings);

        if (mappingError) throw mappingError;
      }

      toast({
        title: "Meta criada!",
        description: "Sua meta financeira foi adicionada com sucesso.",
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        target_amount: "",
        current_amount: "0",
        deadline: "",
        goal_type: "savings",
        priority: "3",
      });
      setAllocations([]);
      setShowAssets(false);
      setAssetSearch("");

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao criar meta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Meta Financeira</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Comprar imóvel"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalhes sobre a meta..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Valor Alvo *</Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_amount">
                Valor Atual
                {allocations.length > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Calculado automaticamente
                  </Badge>
                )}
              </Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                value={allocations.length > 0 ? calculatedValue.toFixed(2) : formData.current_amount}
                onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                placeholder="0.00"
                disabled={allocations.length > 0}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal_type">Tipo</Label>
              <Select
                value={formData.goal_type}
                onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings">Poupança</SelectItem>
                  <SelectItem value="investment">Investimento</SelectItem>
                  <SelectItem value="retirement">Aposentadoria</SelectItem>
                  <SelectItem value="property">Imóvel</SelectItem>
                  <SelectItem value="education">Educação</SelectItem>
                  <SelectItem value="travel">Viagem</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">🔴 Muito Alta</SelectItem>
                  <SelectItem value="2">🟠 Alta</SelectItem>
                  <SelectItem value="3">🟡 Média</SelectItem>
                  <SelectItem value="4">🟢 Baixa</SelectItem>
                  <SelectItem value="5">⚪ Muito Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Prazo</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>
          </div>

          {/* Asset Linking Section */}
          <Collapsible open={showAssets} onOpenChange={setShowAssets} className="border rounded-lg">
            <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <span className="font-medium">Vincular Ativos do Portfólio</span>
                {allocations.length > 0 && (
                  <Badge variant="default" className="ml-2">
                    {allocations.length} ativo{allocations.length > 1 ? 's' : ''} selecionado{allocations.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAssets ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-4 pb-4">
              <p className="text-sm text-muted-foreground mb-3">
                Selecione os ativos que devem ser contabilizados para esta meta. O valor atual será calculado automaticamente.
              </p>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar ativo..."
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Assets grouped by class */}
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {Object.keys(groupedAssets).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {assets.length === 0 ? "Nenhum ativo encontrado no portfólio" : "Nenhum ativo encontrado com o filtro"}
                  </p>
                ) : (
                  Object.entries(groupedAssets).map(([assetClass, classAssets]) => (
                    <div key={assetClass}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">{assetClass}</h4>
                      <div className="space-y-2">
                        {classAssets.map((asset) => {
                          const allocation = allocations.find(a => a.assetId === asset.id);
                          const isSelected = !!allocation;
                          const assetValue = getAssetValue(asset);

                          return (
                            <div key={asset.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                              <Checkbox
                                id={`add-${asset.id}`}
                                checked={isSelected}
                                onCheckedChange={() => handleAssetToggle(asset.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <label
                                  htmlFor={`add-${asset.id}`}
                                  className="text-sm font-medium cursor-pointer block truncate"
                                >
                                  {asset.ticker}
                                  <span className="text-muted-foreground ml-2 font-normal">
                                    {formatCurrency(assetValue)}
                                  </span>
                                </label>
                              </div>
                              {isSelected && (
                                <div className="flex items-center gap-2 min-w-[140px]">
                                  <Slider
                                    value={[allocation!.percentage]}
                                    onValueChange={([val]) => handleAllocationChange(asset.id, val)}
                                    max={100}
                                    min={1}
                                    step={1}
                                    className="w-20"
                                  />
                                  <span className="text-sm font-medium w-10 text-right">
                                    {allocation!.percentage}%
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Summary */}
              {allocations.length > 0 && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Valor calculado dos ativos:</span>
                    <span className="text-lg font-bold text-primary">{formatCurrency(calculatedValue)}</span>
                  </div>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Meta"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
