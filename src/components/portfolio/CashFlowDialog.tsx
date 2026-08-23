import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CashFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  type: 'deposit' | 'withdrawal';
}

export const CashFlowDialog = ({ open, onOpenChange, onSuccess, type }: CashFlowDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState("");

  const isDeposit = type === 'deposit';
  const title = isDeposit ? "Registrar Aporte" : "Registrar Retirada";
  const Icon = isDeposit ? TrendingUp : TrendingDown;
  const colorClass = isDeposit ? "text-green-500" : "text-red-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor deve ser maior que zero.",
        variant: "destructive"
      });
      return;
    }

    if (!date) {
      toast({
        title: "Data inválida",
        description: "Selecione uma data válida.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("portfolio_cash_flows").insert({
        user_id: user.id,
        flow_type: type,
        amount: parseFloat(amount),
        flow_date: date.toISOString().split('T')[0],
        description: description || null
      });

      if (error) throw error;

      toast({
        title: isDeposit ? "Aporte registrado!" : "Retirada registrada!",
        description: `${isDeposit ? "Aporte" : "Retirada"} de R$ ${parseFloat(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} registrado(a) com sucesso.`
      });

      // Reset form
      setAmount("");
      setDate(new Date());
      setDescription("");
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error recording cash flow:", error);
      toast({
        title: "Erro ao registrar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", colorClass)} />
            {title}
          </DialogTitle>
          <DialogDescription>
            {isDeposit 
              ? "Registre um novo aporte de capital na sua carteira para cálculo correto de rentabilidade."
              : "Registre uma retirada de capital da sua carteira para cálculo correto de rentabilidade."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label>Data *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder={isDeposit ? "Ex: Aporte mensal, 13º salário..." : "Ex: Resgate parcial, emergência..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className={isDeposit ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {loading ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
