import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Mail, CheckCircle, Clock, UserCheck, Loader2 } from "lucide-react";

interface AuthorizedEmailsManagerProps {
  organizationId: string;
}

interface LinkResult {
  email: string;
  status: 'linked' | 'pending' | 'error';
  message: string;
}

export const AuthorizedEmailsManager = ({ organizationId }: AuthorizedEmailsManagerProps) => {
  const { toast } = useToast();
  const [emailsText, setEmailsText] = useState("");
  const [selectedRole, setSelectedRole] = useState("assessor");
  const [loading, setLoading] = useState(false);

  const { data: authorizedEmails, refetch } = useQuery({
    queryKey: ['authorized-emails', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('authorized_organization_emails' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;
      return data as any[];
    },
  });

  const handleAddEmails = async () => {
    setLoading(true);
    try {
      const emails = emailsText
        .split(/[,\n;]/)
        .map(e => e.trim().toLowerCase())
        .filter(e => e && e.includes('@'));

      if (emails.length === 0) {
        toast({
          title: "Nenhum email válido",
          description: "Digite pelo menos um email válido",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Call edge function to process emails (links existing users automatically)
      const { data, error } = await supabase.functions.invoke('link-existing-user-to-org', {
        body: {
          emails: emails.map(email => ({ email, role: selectedRole })),
          organization_id: organizationId
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar emails');
      }

      const results: LinkResult[] = data.results || [];
      const linkedCount = results.filter(r => r.status === 'linked').length;
      const pendingCount = results.filter(r => r.status === 'pending').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      // Build detailed message
      let description = '';
      if (linkedCount > 0) {
        description += `${linkedCount} usuário(s) vinculado(s). `;
      }
      if (pendingCount > 0) {
        description += `${pendingCount} email(s) aguardando cadastro. `;
      }
      if (errorCount > 0) {
        const errorMessages = results
          .filter(r => r.status === 'error')
          .map(r => `${r.email}: ${r.message}`)
          .join('; ');
        description += `${errorCount} erro(s): ${errorMessages}`;
      }

      toast({
        title: linkedCount > 0 ? "Usuários vinculados!" : "Emails autorizados!",
        description: description.trim(),
        variant: errorCount > 0 && linkedCount === 0 && pendingCount === 0 ? "destructive" : "default",
      });

      setEmailsText("");
      refetch();

    } catch (error: any) {
      console.error('Error adding emails:', error);
      toast({
        title: "Erro ao processar emails",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (emailId: string) => {
    const { error } = await supabase
      .from('authorized_organization_emails' as any)
      .delete()
      .eq('id', emailId) as any;

    if (error) {
      toast({
        title: "Erro ao remover email",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email removido!",
        description: "O email foi removido da lista de autorizados.",
      });
      refetch();
    }
  };

  const usedEmails = authorizedEmails?.filter(e => e.used_at) || [];
  const pendingEmails = authorizedEmails?.filter(e => !e.used_at) || [];

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="emails">Adicionar Emails em Massa</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Digite os emails separados por vírgula, ponto e vírgula ou quebra de linha
            </p>
            <Textarea
              id="emails"
              placeholder="email1@exemplo.com, email2@exemplo.com&#10;email3@exemplo.com"
              value={emailsText}
              onChange={(e) => setEmailsText(e.target.value)}
              rows={5}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="role">Perfil para os Novos Usuários</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assessor">Assessor</SelectItem>
                  <SelectItem value="gestor">Gestor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleAddEmails} disabled={loading || !emailsText.trim()}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {loading ? "Processando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Emails Pendentes ({pendingEmails.length})
          </h4>
          {pendingEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum email pendente</p>
          ) : (
            <div className="space-y-2">
              {pendingEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{email.email}</span>
                    <Badge variant="outline">{email.role}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmail(email.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Emails Utilizados ({usedEmails.length})
          </h4>
          {usedEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum email utilizado ainda</p>
          ) : (
            <div className="space-y-2">
              {usedEmails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{email.email}</span>
                    <Badge variant="secondary">{email.role}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Usado em {new Date(email.used_at!).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
