import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Pencil, Trash2, Eye, MapPin, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface PatrimonyAsset {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  acquisition_value: number;
  current_value: number | null;
  acquisition_date: string | null;
  description: string | null;
  source: string;
  ir_year: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  company_name: string | null;
  ownership_percentage: number | null;
  brand: string | null;
  model: string | null;
  notes: string | null;
}

interface PatrimonyListProps {
  assets: PatrimonyAsset[];
  onRefresh: () => void;
  categoryConfig: Record<string, { label: string; icon: any; color: string }>;
}

export const PatrimonyList = ({ assets, onRefresh, categoryConfig }: PatrimonyListProps) => {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewAsset, setViewAsset] = useState<PatrimonyAsset | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('patrimony_assets' as any)
        .update({ is_active: false })
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: "Bem removido",
        description: "O patrimônio foi removido com sucesso.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteId(null);
    }
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum bem cadastrado nesta categoria.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {assets.map((asset) => {
          const config = categoryConfig[asset.category] || { label: 'Outro', icon: null, color: 'hsl(var(--muted))' };
          const Icon = config.icon;
          const value = asset.current_value || asset.acquisition_value;
          
          return (
            <div 
              key={asset.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div 
                  className="p-2 rounded-lg shrink-0"
                  style={{ backgroundColor: `${config.color}20` }}
                >
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{asset.name}</p>
                    {asset.source === 'irpf' && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        IR {asset.ir_year}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{asset.subcategory || config.label}</span>
                    {asset.city && asset.state && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {asset.city}/{asset.state}
                        </span>
                      </>
                    )}
                    {asset.company_name && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {asset.company_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(value)}</p>
                  {asset.current_value && asset.acquisition_value && asset.current_value !== asset.acquisition_value && (
                    <p className={`text-xs ${asset.current_value > asset.acquisition_value ? 'text-green-600' : 'text-red-600'}`}>
                      {asset.current_value > asset.acquisition_value ? '+' : ''}
                      {(((asset.current_value - asset.acquisition_value) / asset.acquisition_value) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewAsset(asset)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setDeleteId(asset.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover bem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o bem do seu patrimônio. Você pode adicionar novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewAsset} onOpenChange={() => setViewAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewAsset?.name}</DialogTitle>
          </DialogHeader>
          {viewAsset && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">{categoryConfig[viewAsset.category]?.label || viewAsset.category}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subcategoria</p>
                  <p className="font-medium">{viewAsset.subcategory || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor de Aquisição</p>
                  <p className="font-medium">{formatCurrency(viewAsset.acquisition_value)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Atual</p>
                  <p className="font-medium">
                    {viewAsset.current_value ? formatCurrency(viewAsset.current_value) : '-'}
                  </p>
                </div>
                {viewAsset.acquisition_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data Aquisição</p>
                    <p className="font-medium">
                      {new Date(viewAsset.acquisition_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Origem</p>
                  <p className="font-medium capitalize">{viewAsset.source}</p>
                </div>
              </div>

              {viewAsset.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-sm">{viewAsset.description}</p>
                </div>
              )}

              {viewAsset.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Endereço</p>
                  <p className="text-sm">
                    {viewAsset.address}
                    {viewAsset.city && `, ${viewAsset.city}`}
                    {viewAsset.state && ` - ${viewAsset.state}`}
                  </p>
                </div>
              )}

              {viewAsset.company_name && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Empresa</p>
                    <p className="font-medium">{viewAsset.company_name}</p>
                  </div>
                  {viewAsset.ownership_percentage && (
                    <div>
                      <p className="text-sm text-muted-foreground">Participação</p>
                      <p className="font-medium">{viewAsset.ownership_percentage}%</p>
                    </div>
                  )}
                </div>
              )}

              {(viewAsset.brand || viewAsset.model) && (
                <div className="grid grid-cols-2 gap-4">
                  {viewAsset.brand && (
                    <div>
                      <p className="text-sm text-muted-foreground">Marca</p>
                      <p className="font-medium">{viewAsset.brand}</p>
                    </div>
                  )}
                  {viewAsset.model && (
                    <div>
                      <p className="text-sm text-muted-foreground">Modelo</p>
                      <p className="font-medium">{viewAsset.model}</p>
                    </div>
                  )}
                </div>
              )}

              {viewAsset.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm">{viewAsset.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};