import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Mail, Calendar as CalendarIcon, MessageSquare, Video, ClipboardList, User } from "lucide-react";

interface InteractionDetailDialogProps {
  interaction: {
    id: string;
    interaction_type: string;
    subject: string;
    description: string | null;
    interaction_date: string;
    status?: string;
  } | null;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getInteractionIcon = (type: string) => {
  const icons: Record<string, any> = {
    call: Phone, email: Mail, meeting: CalendarIcon,
    message: MessageSquare, video_call: Video,
  };
  return icons[type] || ClipboardList;
};

const getInteractionLabel = (type: string) => {
  const labels: Record<string, string> = {
    call: "Ligação", email: "Email", meeting: "Reunião",
    message: "Mensagem", video_call: "Videochamada",
  };
  return labels[type] || type;
};

export const InteractionDetailDialog = ({ interaction, clientName, open, onOpenChange }: InteractionDetailDialogProps) => {
  if (!interaction) return null;

  const Icon = getInteractionIcon(interaction.interaction_type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            {interaction.subject}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{getInteractionLabel(interaction.interaction_type)}</Badge>
            {interaction.status === "scheduled" && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">Agendada</Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            {format(new Date(interaction.interaction_date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            {clientName}
          </div>

          {interaction.description && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-1">Descrição</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{interaction.description}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
