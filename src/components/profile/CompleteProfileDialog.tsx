import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useIsAdvisor } from "@/hooks/useUserRole";

const profileSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  birth_date: z.string().min(1, "Data de nascimento é obrigatória"),
  cpf: z.string()
    .min(11, "CPF deve ter 11 dígitos")
    .max(14, "CPF inválido")
    .regex(/^[\d.-]+$/, "CPF deve conter apenas números"),
  phone: z.string()
    .min(10, "Telefone deve ter no mínimo 10 dígitos")
    .regex(/^[\d\s()-]+$/, "Telefone inválido"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface CompleteProfileDialogProps {
  open: boolean;
  userId: string;
  currentName?: string;
  currentPhone?: string;
  currentCpf?: string;
  currentBirthDate?: string;
  onComplete: () => void;
  allowClose?: boolean;
}

export const CompleteProfileDialog = ({
  open,
  userId,
  currentName,
  currentPhone,
  currentCpf,
  currentBirthDate,
  onComplete,
  allowClose = false,
}: CompleteProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const { isAdvisor, isLoading: isRoleLoading } = useIsAdvisor();

  // Debug log
  console.log('CompleteProfileDialog - isAdvisor:', isAdvisor, 'isRoleLoading:', isRoleLoading);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: currentName || "",
      birth_date: currentBirthDate || "",
      cpf: currentCpf || "",
      phone: currentPhone || "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.full_name,
          birth_date: data.birth_date,
          cpf: data.cpf.replace(/\D/g, ""), // Remove formatting
          phone: data.phone.replace(/\D/g, ""), // Remove formatting
          profile_completed: true,
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Cadastro completado com sucesso!");
      onComplete();
    } catch (error: any) {
      console.error("Error completing profile:", error);
      
      // Handle specific database constraint errors
      if (error.code === '23505' && error.message?.includes('profiles_cpf_key')) {
        toast.error("Este CPF já está cadastrado para outro usuário. Verifique se o CPF está correto.");
        form.setError('cpf', { 
          type: 'manual', 
          message: 'Este CPF já está cadastrado' 
        });
      } else if (error.code === '23505') {
        toast.error("Dados duplicados encontrados. Verifique as informações.");
      } else {
        toast.error(error.message || "Erro ao completar cadastro");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ profile_completed: true })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Você pode completar seu cadastro depois em Meu Perfil.");
      onComplete();
    } catch (error: any) {
      console.error("Error skipping profile:", error);
      toast.error("Erro ao pular cadastro");
    } finally {
      setLoading(false);
    }
  };

  // Assessores e admins podem fechar o dialog
  const canSkip = isAdvisor || allowClose;

  return (
    <Dialog open={open} onOpenChange={canSkip ? (open) => !open && onComplete() : () => {}}>
      <DialogContent 
        className="sm:max-w-[500px]" 
        onInteractOutside={(e) => !canSkip && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {currentName ? 'Editar Informações Pessoais' : 'Complete seu cadastro'}
          </DialogTitle>
          <DialogDescription>
            {currentName 
              ? 'Atualize seus dados pessoais.' 
              : isAdvisor 
                ? 'Preencha seus dados ou pule esta etapa por enquanto.'
                : 'Para continuar, preencha os dados abaixo.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input placeholder="João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="000.000.000-00" 
                      maxLength={14}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        const formatted = value
                          .replace(/(\d{3})(\d)/, "$1.$2")
                          .replace(/(\d{3})(\d)/, "$1.$2")
                          .replace(/(\d{3})(\d{1,2})/, "$1-$2");
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="(00) 00000-0000" 
                      maxLength={15}
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "");
                        const formatted = value
                          .replace(/(\d{2})(\d)/, "($1) $2")
                          .replace(/(\d{5})(\d)/, "$1-$2");
                        field.onChange(formatted);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              {isAdvisor && !allowClose && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1" 
                  disabled={loading || isRoleLoading}
                  onClick={handleSkip}
                >
                  {isRoleLoading ? "Carregando..." : "Pular"}
                </Button>
              )}
              <Button type="submit" className={isAdvisor && !allowClose ? "flex-1" : "w-full"} disabled={loading}>
                {loading ? "Salvando..." : currentName ? "Salvar" : "Completar Cadastro"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
