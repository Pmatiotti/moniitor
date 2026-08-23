import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { validatePassword, checkPasswordBreached } from "@/lib/password-validation";
import { toast } from "sonner";

interface TempPasswordDialogProps {
  open: boolean;
  email: string;
  onSuccess: () => void;
}

export const TempPasswordDialog = ({
  open,
  email,
  onSuccess,
}: TempPasswordDialogProps) => {
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate new password
      const validation = validatePassword(newPassword);
      if (!validation.isValid) {
        toast.error("Senha inválida", {
          description: validation.errors[0],
        });
        setLoading(false);
        return;
      }

      // Check if password has been breached
      const breachCheck = await checkPasswordBreached(newPassword);
      if (breachCheck.isBreached) {
        toast.error("Senha comprometida", {
          description: `Esta senha foi encontrada em ${breachCheck.count.toLocaleString('pt-BR')} vazamentos de dados. Por favor, escolha outra.`,
        });
        setLoading(false);
        return;
      }

      // Verify temp password and get magic link
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        'verify-temp-password',
        {
          body: { email, tempPassword },
        }
      );

      if (verifyError || !verifyData?.success) {
        toast.error(verifyData?.error || "Senha temporária inválida");
        setLoading(false);
        return;
      }

      // Use the magic link to sign in
      const { error: signInError } = await supabase.auth.verifyOtp({
        email,
        token: verifyData.properties.hashed_token,
        type: 'magiclink',
      });

      if (signInError) {
        toast.error("Erro ao autenticar");
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Senha atualizada com sucesso!");
      onSuccess();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erro ao atualizar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Primeiro Acesso</DialogTitle>
          <DialogDescription>
            Digite a senha temporária enviada para seu email e crie uma nova senha.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tempPassword">Senha Temporária</Label>
            <Input
              id="tempPassword"
              type="text"
              placeholder="Digite a senha temporária"
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value.toUpperCase())}
              required
              maxLength={8}
            />
          </div>

          <PasswordInput
            value={newPassword}
            onChange={setNewPassword}
            label="Nova Senha"
            placeholder="Digite sua nova senha"
            showStrength={true}
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Atualizando..." : "Ativar Conta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
