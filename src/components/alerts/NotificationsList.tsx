import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Trash2, AlertCircle, Info, AlertTriangle, Coins, Gift, FileText, Divide, XCircle, DollarSign, FileSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@/pages/Alerts";

interface NotificationsListProps {
  notifications: Notification[];
  onRefresh: () => void;
}

export const NotificationsList = ({ notifications, onRefresh }: NotificationsListProps) => {
  const { toast } = useToast();

  const handleMarkAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao marcar notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("notifications").delete().eq("id", id);
      if (error) throw error;

      toast({
        title: "Notificação removida",
        description: "A notificação foi removida.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Erro ao remover notificação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getIcon = (type: string, title?: string) => {
    const lowerTitle = title?.toLowerCase() || '';
    
    // Corporate events icons
    if (lowerTitle.includes('dividendo') || lowerTitle.includes('provento') || lowerTitle.includes('💰')) {
      return <Coins className="h-4 w-4 text-emerald-600" />;
    }
    if (lowerTitle.includes('jcp') || lowerTitle.includes('juros sobre capital') || lowerTitle.includes('💵')) {
      return <DollarSign className="h-4 w-4 text-green-600" />;
    }
    if (lowerTitle.includes('bonifica') || lowerTitle.includes('🎁')) {
      return <Gift className="h-4 w-4 text-purple-600" />;
    }
    if (lowerTitle.includes('subscri') || lowerTitle.includes('📝')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    if (lowerTitle.includes('desdobramento') || lowerTitle.includes('➗')) {
      return <Divide className="h-4 w-4 text-orange-600" />;
    }
    if (lowerTitle.includes('grupamento') || lowerTitle.includes('✖️')) {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    if (lowerTitle.includes('fato relevante') || lowerTitle.includes('📋')) {
      return <FileSearch className="h-4 w-4 text-indigo-600" />;
    }
    if (lowerTitle.includes('amortiza') || lowerTitle.includes('💸')) {
      return <DollarSign className="h-4 w-4 text-teal-600" />;
    }
    
    // Standard notification types
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR');
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma notificação ainda.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]">
      <div className="space-y-4">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 rounded-lg border ${
              notification.is_read ? 'bg-background' : 'bg-muted/50'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3 flex-1">
                {getIcon(notification.notification_type, notification.title)}
                <div className="flex-1 space-y-1">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {formatDate(notification.created_at)}
                    </Badge>
                    {!notification.is_read && (
                      <Badge variant="default" className="text-xs">
                        Novo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                {!notification.is_read && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(notification.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
