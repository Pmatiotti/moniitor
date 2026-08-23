import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone, Mail, Calendar, MessageSquare, Video } from "lucide-react";

const interactionTypes = [
  { value: "call", label: "Ligação", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "meeting", label: "Reunião", icon: Calendar },
  { value: "message", label: "Mensagem", icon: MessageSquare },
  { value: "video_call", label: "Videochamada", icon: Video },
];

interface AddInteractionDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  defaultType?: string;
}

export const AddInteractionDialog = ({
  clientId,
  open,
  onOpenChange,
  onSuccess,
  defaultType,
}: AddInteractionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    interaction_type: defaultType || "call",
    subject: "",
    description: "",
    interaction_date: new Date().toISOString().split("T")[0],
  });

  // Reset form when dialog opens with a specific defaultType
  useEffect(() => {
    if (open && defaultType) {
      setFormData(prev => ({ ...prev, interaction_type: defaultType }));
    }
  }, [open, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Determine status based on date
      const today = new Date().toISOString().split("T")[0];
      const isScheduled = formData.interaction_date > today;

      // 1. Inserir interação
      const { error } = await supabase.from("interactions").insert({
        client_id: clientId,
        advisor_id: user.id,
        interaction_type: formData.interaction_type,
        subject: formData.subject,
        description: formData.description || null,
        interaction_date: formData.interaction_date,
        status: isScheduled ? "scheduled" : "completed",
      } as any);

      if (error) throw error;

      // 2. Se for reunião, atualizar updated_at do cliente (régua de contato)
      if (formData.interaction_type === "meeting") {
        await supabase
          .from("clients")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", clientId);
      }

      toast.success("Atividade registrada com sucesso!");
      onOpenChange(false);
      setFormData({
        interaction_type: "call",
        subject: "",
        description: "",
        interaction_date: new Date().toISOString().split("T")[0],
      });
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar atividade");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Atividade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.interaction_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, interaction_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interactionTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {type.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.interaction_date}
                onChange={(e) =>
                  setFormData({ ...formData, interaction_date: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assunto *</Label>
            <Input
              placeholder="Ex: Acompanhamento mensal"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Detalhes da atividade..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
