import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pencil, Trash2, Target, Calendar, Link2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  goal_type: string;
  status: string;
  priority?: number;
}

interface LinkedAsset {
  id: string;
  asset_id: string;
  allocation_percentage: number;
  ticker: string;
  asset_class: string;
  current_value: number;
}

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
}

export const GoalCard = ({ goal, onEdit, onDelete }: GoalCardProps) => {
  const [linkedAssets, setLinkedAssets] = useState<LinkedAsset[]>([]);
  const [showAssets, setShowAssets] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
  const remaining = goal.target_amount - goal.current_amount;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getGoalTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      savings: "Poupança",
      investment: "Investimento",
      retirement: "Aposentadoria",
      property: "Imóvel",
      education: "Educação",
      travel: "Viagem",
      other: "Outro",
    };
    return types[type] || type;
  };

  const getPriorityBadge = (priority?: number) => {
    if (!priority) return null;
    const priorities: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      1: { label: "🔴 Muito Alta", variant: "destructive" },
      2: { label: "🟠 Alta", variant: "default" },
      3: { label: "🟡 Média", variant: "secondary" },
      4: { label: "🟢 Baixa", variant: "outline" },
      5: { label: "⚪ Muito Baixa", variant: "outline" },
    };
    const p = priorities[priority] || priorities[3];
    return <Badge variant={p.variant} className="text-xs">{p.label}</Badge>;
  };

  const daysRemaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  useEffect(() => {
    fetchLinkedAssets();
  }, [goal.id]);

  const fetchLinkedAssets = async () => {
    setLoadingAssets(true);
    try {
      const { data: mappings, error: mappingsError } = await supabase
        .from("goal_portfolio_mappings")
        .select("id, asset_id, allocation_percentage")
        .eq("goal_id", goal.id);

      if (mappingsError) throw mappingsError;

      if (!mappings || mappings.length === 0) {
        setLinkedAssets([]);
        return;
      }

      const assetIds = mappings.map(m => m.asset_id).filter(Boolean);
      if (assetIds.length === 0) {
        setLinkedAssets([]);
        return;
      }

      const { data: assets, error: assetsError } = await supabase
        .from("assets")
        .select("id, ticker, asset_class, current_price, quantity, invested_amount")
        .in("id", assetIds);

      if (assetsError) throw assetsError;

      const enrichedAssets: LinkedAsset[] = mappings.map(mapping => {
        const asset = assets?.find(a => a.id === mapping.asset_id);
        if (!asset) return null;

        const usesInvested = (asset.asset_class === 'Renda Fixa' || asset.asset_class === 'Multimercado') && 
                             asset.invested_amount && Number(asset.invested_amount) > 0;
        const totalValue = usesInvested 
          ? Number(asset.current_price || 0) 
          : Number(asset.current_price || 0) * Number(asset.quantity);
        
        const allocatedValue = totalValue * ((mapping.allocation_percentage || 100) / 100);

        return {
          id: mapping.id,
          asset_id: mapping.asset_id!,
          allocation_percentage: mapping.allocation_percentage || 100,
          ticker: asset.ticker,
          asset_class: asset.asset_class,
          current_value: allocatedValue,
        };
      }).filter(Boolean) as LinkedAsset[];

      setLinkedAssets(enrichedAssets);
    } catch (error) {
      console.error("Error fetching linked assets:", error);
    } finally {
      setLoadingAssets(false);
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{goal.title}</CardTitle>
              {getPriorityBadge(goal.priority)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>{getGoalTypeLabel(goal.goal_type)}</span>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(goal)}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(goal.id)}
              className="h-8 w-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {goal.description && (
          <p className="text-sm text-muted-foreground mt-2">{goal.description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-1">Atual</p>
            <p className="font-semibold text-lg">{formatCurrency(goal.current_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1">Meta</p>
            <p className="font-semibold text-lg">{formatCurrency(goal.target_amount)}</p>
          </div>
        </div>

        {remaining > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Faltam <span className="font-semibold text-foreground">{formatCurrency(remaining)}</span> para atingir a meta
            </p>
          </div>
        )}

        {/* Linked Assets Section */}
        {linkedAssets.length > 0 && (
          <div className="pt-2 border-t">
            <button
              onClick={() => setShowAssets(!showAssets)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <Link2 className="h-4 w-4" />
              <span className="font-medium">Ativos Vinculados</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="ml-1">
                      {linkedAssets.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{linkedAssets.length} ativo{linkedAssets.length > 1 ? 's' : ''} vinculado{linkedAssets.length > 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="ml-auto">
                {showAssets ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </span>
            </button>
            
            {showAssets && (
              <div className="mt-2 space-y-1.5">
                {linkedAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between text-sm bg-muted/50 rounded-md px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{asset.ticker}</span>
                      {asset.allocation_percentage < 100 && (
                        <Badge variant="outline" className="text-xs">
                          {asset.allocation_percentage}%
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground">{formatCurrency(asset.current_value)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t mt-2">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(linkedAssets.reduce((sum, a) => sum + a.current_value, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {goal.deadline && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
            <Calendar className="h-4 w-4" />
            <span>
              Prazo: {format(new Date(goal.deadline), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              {daysRemaining !== null && (
                <span className={`ml-2 font-medium ${daysRemaining < 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  ({daysRemaining > 0 ? `${daysRemaining} dias restantes` : daysRemaining === 0 ? 'Hoje!' : 'Prazo expirado'})
                </span>
              )}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
