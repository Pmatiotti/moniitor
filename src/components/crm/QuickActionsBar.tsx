import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Mail,
  Calendar,
  Phone,
  FileText,
  Share2,
  MoreHorizontal,
  Pencil,
  UserPlus,
  ClipboardList,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Client } from "@/pages/CRM";
import { SendClientInvitationDialog } from "./SendClientInvitationDialog";
import { AddInteractionDialog } from "./AddInteractionDialog";

interface QuickActionsBarProps {
  client: Client;
  onEdit?: () => void;
  showInviteButton?: boolean;
  onInteractionAdded?: () => void;
}

export const QuickActionsBar = ({ client, onEdit, showInviteButton = false, onInteractionAdded }: QuickActionsBarProps) => {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [interactionDialogOpen, setInteractionDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const handleWhatsApp = () => {
    if (!client.phone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }
    
    // Remover caracteres não numéricos
    const phone = client.phone.replace(/\D/g, "");
    const message = `Olá ${client.name}, tudo bem? Aqui é da Monitôr, estou entrando em contato para...`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleEmail = () => {
    if (!client.email) {
      toast.error("Cliente não possui email cadastrado");
      return;
    }

    const subject = encodeURIComponent(`Acompanhamento - ${client.name}`);
    const body = encodeURIComponent(
      `Olá ${client.name},\n\nEstou entrando em contato para fazer um acompanhamento do seu portfólio.\n\nQualquer dúvida, estou à disposição.\n\nAtenciosamente,`
    );
    window.location.href = `mailto:${client.email}?subject=${subject}&body=${body}`;
  };

  const handleCall = () => {
    if (!client.phone) {
      toast.error("Cliente não possui telefone cadastrado");
      return;
    }
    window.location.href = `tel:${client.phone}`;
  };

  const handleShare = async () => {
    const shareData = {
      title: `Cliente: ${client.name}`,
      text: `Informações do cliente ${client.name}\nPatrimônio: R$ ${Number(client.portfolio_value || 0).toLocaleString("pt-BR")}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success("Compartilhado com sucesso");
      } catch (error) {
        console.error("Erro ao compartilhar:", error);
      }
    } else {
      // Fallback: copiar para área de transferência
      navigator.clipboard.writeText(shareData.text);
      toast.success("Informações copiadas para área de transferência");
    }
  };

  const handleGenerateReport = () => {
    toast.info("Gerando relatório...");
    // Esta função será implementada no componente pai
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {showInviteButton && client.email && !client.user_id && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setInviteDialogOpen(true)}
            className="gap-2"
            title="Convidar cliente para a plataforma"
          >
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Convidar</span>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setInteractionDialogOpen(true)}
          className="gap-2"
          title="Registrar atividade"
        >
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">Atividade</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleWhatsApp}
          className="gap-2"
          title="Enviar mensagem no WhatsApp"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleEmail}
          className="gap-2"
          title="Enviar email"
        >
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Email</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCall}
          className="gap-2"
          title="Fazer ligação"
        >
          <Phone className="h-4 w-4" />
          <span className="hidden sm:inline">Ligar</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setMeetingDialogOpen(true)}
          className="gap-2"
          title="Agendar reunião"
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Agendar</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="gap-2"
          title="Editar cliente"
        >
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">Editar</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <MoreHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Mais</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {showInviteButton && client.email && !client.user_id && (
              <DropdownMenuItem onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Convidar para Plataforma
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleGenerateReport}>
              <FileText className="mr-2 h-4 w-4" />
              Gerar Relatório
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {client.email && (
        <SendClientInvitationDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
        />
      )}

      <AddInteractionDialog
        clientId={client.id}
        open={interactionDialogOpen}
        onOpenChange={setInteractionDialogOpen}
        onSuccess={onInteractionAdded}
      />

      <AddInteractionDialog
        clientId={client.id}
        open={meetingDialogOpen}
        onOpenChange={setMeetingDialogOpen}
        onSuccess={onInteractionAdded}
        defaultType="meeting"
      />
    </>
  );
};
