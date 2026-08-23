import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MessageSquare, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WhatsAppNotificationSettingsProps {
  userId: string;
  phone: string | null;
  whatsappEnabled: boolean;
  onUpdate: () => void;
}

export const WhatsAppNotificationSettings = ({
  userId,
  phone,
  whatsappEnabled,
  onUpdate,
}: WhatsAppNotificationSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(whatsappEnabled);
  const [phoneNumber, setPhoneNumber] = useState(phone || "");
  const [editingPhone, setEditingPhone] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!phone && checked) {
      toast.error("Você precisa cadastrar um telefone para receber notificações via WhatsApp.");
      setEditingPhone(true);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ whatsapp_notifications_enabled: checked })
        .eq("id", userId);

      if (error) throw error;

      setEnabled(checked);
      toast.success(checked ? "Notificações WhatsApp ativadas!" : "Notificações WhatsApp desativadas.");
      onUpdate();
    } catch (error: any) {
      console.error("Error updating WhatsApp settings:", error);
      toast.error("Erro ao atualizar configurações.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePhone = async () => {
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 10) {
      toast.error("Informe um telefone válido.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          phone: phoneNumber.replace(/\D/g, ""),
          whatsapp_notifications_enabled: true,
        })
        .eq("id", userId);

      if (error) throw error;

      setEnabled(true);
      setEditingPhone(false);
      toast.success("Telefone atualizado e notificações ativadas!");
      onUpdate();
    } catch (error: any) {
      console.error("Error saving phone:", error);
      toast.error("Erro ao salvar telefone.");
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 15);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          Notificações WhatsApp
        </CardTitle>
        <CardDescription>
          Receba alertas de proventos, variação de preços e mais diretamente no seu WhatsApp
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {phone && !editingPhone ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {phone.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingPhone(true)}
                className="text-xs"
              >
                Alterar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="whatsapp-toggle" className="text-sm">
                {enabled ? "Ativado" : "Desativado"}
              </Label>
              <Switch
                id="whatsapp-toggle"
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={loading}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="(00) 00000-0000"
                value={formatPhone(phoneNumber)}
                onChange={(e) => setPhoneNumber(e.target.value)}
                maxLength={15}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSavePhone}
                disabled={loading}
                size="sm"
              >
                {loading ? "Salvando..." : "Salvar e Ativar"}
              </Button>
              {editingPhone && phone && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingPhone(false);
                    setPhoneNumber(phone);
                  }}
                  size="sm"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Você receberá notificações quando:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Novos proventos forem anunciados</li>
            <li>Proventos forem pagos</li>
            <li>Seus alertas personalizados forem acionados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
