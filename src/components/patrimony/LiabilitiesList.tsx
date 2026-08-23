import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  MoreHorizontal,
  Trash2,
  Eye,
  Building2,
  Car,
  Wallet,
  CreditCard,
  FileText,
  CheckCircle2,
} from "lucide-react";

interface Liability {
  id: string;
  category: string;
  name: string;
  description: string | null;
  original_value: number;
  current_balance: number;
  interest_rate: number | null;
  start_date: string | null;
  end_date: string | null;
  installment_value: number | null;
  total_installments: number | null;
  paid_installments: number;
  creditor_name: string | null;
  creditor_type: string | null;
  is_active: boolean;
  source: string;
  notes: string | null;
}

interface LiabilitiesListProps {
  liabilities: Liability[];
  onRefresh: () => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  financiamento_imobiliario: { label: "Financ. Imobiliário", icon: Building2, color: "hsl(var(--chart-1))" },
  financiamento_veicular: { label: "Financ. Veicular", icon: Car, color: "hsl(var(--chart-2))" },
  emprestimo_pessoal: { label: "Empréstimo", icon: Wallet, color: "hsl(var(--chart-3))" },
  cartao_credito: { label: "Cartão de Crédito", icon: CreditCard, color: "hsl(var(--chart-4))" },
  outros: { label: "Outras Dívidas", icon: FileText, color: "hsl(var(--chart-5))" },
};

export const LiabilitiesList = ({ liabilities, onRefresh }: LiabilitiesListProps) => {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewLiability, setViewLiability] = useState<Liability | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("patrimony_liabilities")
        .update({ is_active: false })
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: "Passivo removido",
        description: "O passivo foi removido com sucesso.",
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

  const handleMarkAsPaid = async (id: string) => {
    try {
      const { error } = await supabase
        .from("patrimony_liabilities")
        .update({ is_active: false, current_balance: 0 })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Passivo quitado",
        description: "O passivo foi marcado como quitado.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao quitar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (liabilities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum passivo cadastrado.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {liabilities.map((liability) => {
          const config = CATEGORY_CONFIG[liability.category] || CATEGORY_CONFIG.outros;
          const Icon = config.icon;
          const paidPercentage = liability.original_value > 0
            ? ((liability.original_value - liability.current_balance) / liability.original_value) * 100
            : 0;
          const installmentProgress = liability.total_installments
            ? (liability.paid_installments / liability.total_installments) * 100
            : null;

          return (
            <div
              key={liability.id}
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
                    <p className="font-medium truncate">{liability.name}</p>
                    {liability.interest_rate && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {liability.interest_rate}% a.a.
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{config.label}</span>
                    {liability.creditor_name && (
                      <>
                        <span>•</span>
                        <span>{liability.creditor_name}</span>
                      </>
                    )}
                    {installmentProgress !== null && (
                      <>
                        <span>•</span>
                        <span>
                          {liability.paid_installments}/{liability.total_installments} parcelas
                        </span>
                      </>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2">
                    <Progress value={paidPercentage} className="h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {paidPercentage.toFixed(0)}% pago
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-destructive">
                    {formatCurrency(liability.current_balance)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    de {formatCurrency(liability.original_value)}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewLiability(liability)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalhes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMarkAsPaid(liability.id)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar como quitado
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeleteId(liability.id)}
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
            <AlertDialogTitle>Remover passivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover o passivo do seu registro. Você pode adicionar novamente depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details Dialog */}
      <Dialog open={!!viewLiability} onOpenChange={() => setViewLiability(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewLiability?.name}</DialogTitle>
          </DialogHeader>
          {viewLiability && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Categoria</p>
                  <p className="font-medium">
                    {CATEGORY_CONFIG[viewLiability.category]?.label || viewLiability.category}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Credor</p>
                  <p className="font-medium">{viewLiability.creditor_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Original</p>
                  <p className="font-medium">{formatCurrency(viewLiability.original_value)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Devedor</p>
                  <p className="font-medium text-destructive">
                    {formatCurrency(viewLiability.current_balance)}
                  </p>
                </div>
                {viewLiability.interest_rate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Juros</p>
                    <p className="font-medium">{viewLiability.interest_rate}% a.a.</p>
                  </div>
                )}
                {viewLiability.installment_value && (
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Parcela</p>
                    <p className="font-medium">{formatCurrency(viewLiability.installment_value)}</p>
                  </div>
                )}
                {viewLiability.start_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Data Início</p>
                    <p className="font-medium">
                      {new Date(viewLiability.start_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
                {viewLiability.end_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Previsão Quitação</p>
                    <p className="font-medium">
                      {new Date(viewLiability.end_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                )}
                {viewLiability.total_installments && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Parcelas Pagas</p>
                      <p className="font-medium">
                        {viewLiability.paid_installments} de {viewLiability.total_installments}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parcelas Restantes</p>
                      <p className="font-medium">
                        {viewLiability.total_installments - viewLiability.paid_installments}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {viewLiability.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p className="text-sm">{viewLiability.description}</p>
                </div>
              )}

              {viewLiability.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  <p className="text-sm">{viewLiability.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
