import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, UserPlus, Loader2, CheckCircle2 } from "lucide-react";

interface SendClientInvitationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const SendClientInvitationDialog = ({ 
  open, 
  onOpenChange,
  onSuccess 
}: SendClientInvitationDialogProps) => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{ type: string; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error("Digite o email do cliente");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Digite um email válido");
      return;
    }

    setIsLoading(true);
    setSuccess(null);

    try {
      const { data, error } = await supabase.functions.invoke('send-client-invitation', {
        body: { 
          email: email.trim(),
          message: message.trim() || undefined
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Falha ao enviar convite');
      }

      setSuccess({
        type: data.invitation_type,
        message: data.message
      });

      toast.success("Convite enviado com sucesso!");
      onSuccess?.();

      // Reset form after delay
      setTimeout(() => {
        setEmail("");
        setMessage("");
        setSuccess(null);
        onOpenChange(false);
      }, 3000);

    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error(error instanceof Error ? error.message : "Erro ao enviar convite");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail("");
      setMessage("");
      setSuccess(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Convidar Cliente
          </DialogTitle>
          <DialogDescription>
            Envie um convite para vincular um cliente ao seu atendimento
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <p className="font-medium text-green-600 dark:text-green-400">
                Convite enviado!
              </p>
              <p className="text-sm text-muted-foreground">
                {success.message}
              </p>
              {success.type === 'existing_user' && (
                <p className="text-xs text-muted-foreground">
                  O cliente verá o convite ao acessar a plataforma
                </p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do Cliente *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Se o cliente já possui conta, receberá uma notificação interna. 
                Caso contrário, receberá um email com link para criar conta.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Olá! Gostaria de acompanhar seus investimentos..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Convite
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
