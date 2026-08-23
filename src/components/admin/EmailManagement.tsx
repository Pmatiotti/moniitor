import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Mail, Send, Activity, ExternalLink, AlertTriangle, FileCode, Info } from "lucide-react";
import { format } from "date-fns";
import { EmailTemplatesManager } from "./EmailTemplatesManager";

export const EmailManagement = () => {
  const [testEmail, setTestEmail] = useState("");
  const [testEmailType, setTestEmailType] = useState("welcome");
  const [isSending, setIsSending] = useState(false);

  // Buscar logs de emails reais do banco de dados
  const { data: emailLogs, refetch } = useQuery({
    queryKey: ['email-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Digite um email para teste");
      return;
    }

    setIsSending(true);
    try {
      let functionName = '';
      let payload: any = {
        userEmail: testEmail,
        userName: "Usuário Teste",
      };

      switch (testEmailType) {
        case 'welcome':
          functionName = 'send-welcome-email';
          break;
        case 'subscription':
          functionName = 'send-subscription-confirmation';
          payload = {
            ...payload,
            planName: "Pro",
            planPrice: "R$ 299,00/mês",
            nextBillingDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "dd/MM/yyyy"),
          };
          break;
        case 'goal':
          functionName = 'send-goal-achieved';
          payload = {
            ...payload,
            goalName: "Reserva de Emergência",
            goalValue: "R$ 50.000,00",
            achievedDate: format(new Date(), "dd/MM/yyyy"),
            monthsToAchieve: 12,
          };
          break;
        case 'renewal':
          functionName = 'send-renewal-reminder';
          payload = {
            ...payload,
            planType: "Pro",
            renewalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          };
          break;
        case 'monthly':
          functionName = 'send-monthly-report';
          payload = {
            ...payload,
            portfolioValue: 150000,
            monthlyReturn: 5.2,
            topAssets: [
              { ticker: "PETR4", return: 8.5 },
              { ticker: "VALE3", return: 6.2 },
              { ticker: "ITUB4", return: 4.1 },
            ],
          };
          break;
        case 'alerts':
          functionName = 'send-portfolio-alerts';
          payload = {
            ...payload,
            alerts: [
              {
                ticker: "PETR4",
                alertType: "Preço acima do limite",
                currentValue: 42.50,
                threshold: 40.00,
                message: "O ativo ultrapassou o preço configurado no alerta",
              },
              {
                ticker: "VALE3",
                alertType: "Preço abaixo do limite",
                currentValue: 68.20,
                threshold: 70.00,
                message: "O ativo caiu abaixo do preço configurado no alerta",
              },
            ],
          };
          break;
        default:
          toast.error("Tipo de email inválido");
          return;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (error) throw error;

      toast.success("Email de teste enviado com sucesso!");
      refetch();
    } catch (error: any) {
      console.error("Erro ao enviar email de teste:", error);
      toast.error("Erro ao enviar email: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Gerenciamento de Emails
        </h2>
        <p className="text-muted-foreground mt-1">
          Configure e monitore os emails transacionais da plataforma
        </p>
      </div>

      <Tabs defaultValue="test" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">
            <Send className="h-4 w-4 mr-2" />
            Testar Email
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileCode className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="history">
            <Activity className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enviar Email de Teste</CardTitle>
              <CardDescription>
                Teste os templates de email enviando para um endereço específico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Email de destino</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="teste@exemplo.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-type">Tipo de Email</Label>
                <Select value={testEmailType} onValueChange={setTestEmailType}>
                  <SelectTrigger id="email-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="welcome">
                      🎉 Boas-vindas
                    </SelectItem>
                    <SelectItem value="subscription">
                      ✅ Confirmação de Assinatura
                    </SelectItem>
                    <SelectItem value="goal">
                      🎯 Meta Atingida
                    </SelectItem>
                    <SelectItem value="renewal">
                      🔔 Lembrete de Renovação
                    </SelectItem>
                    <SelectItem value="monthly">
                      📊 Relatório Mensal
                    </SelectItem>
                    <SelectItem value="alerts">
                      🚨 Alertas de Portfólio
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleTestEmail} 
                disabled={isSending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isSending ? "Enviando..." : "Enviar Email de Teste"}
              </Button>
            </CardContent>
          </Card>

          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 dark:text-amber-100">
              Email de Teste em Uso
            </AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <p className="mb-3">
                <strong>Remetente atual:</strong> Investimentos &lt;onboarding@resend.dev&gt;
              </p>
              <p className="mb-3">
                Este é um email de teste do Resend com limitações. Para produção, você precisa:
              </p>
              <ol className="list-decimal list-inside space-y-1 mb-4">
                <li>Verificar seu domínio no Resend</li>
                <li>Atualizar o campo "from" nas edge functions</li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="border-amber-600 text-amber-900 dark:text-amber-100 hover:bg-amber-500/20"
                onClick={() => window.open("https://resend.com/domains", "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Configurar no Resend
              </Button>
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Emails Disponíveis</CardTitle>
              <CardDescription>
                Templates de email configurados na plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">🎉 Boas-vindas</p>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando um novo usuário se cadastra
                    </p>
                  </div>
                  <Badge variant="outline">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">✅ Confirmação de Assinatura</p>
                    <p className="text-sm text-muted-foreground">
                      Enviado após assinatura de plano pago
                    </p>
                  </div>
                  <Badge variant="outline">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">🎯 Meta Atingida</p>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando usuário atinge uma meta financeira
                    </p>
                  </div>
                  <Badge variant="outline">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">🔔 Lembrete de Renovação</p>
                    <p className="text-sm text-muted-foreground">
                      Enviado antes da renovação de assinatura
                    </p>
                  </div>
                  <Badge variant="outline">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">📊 Relatório Mensal</p>
                    <p className="text-sm text-muted-foreground">
                      Resumo mensal do portfólio
                    </p>
                  </div>
                  <Badge variant="outline">Ativo</Badge>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">🚨 Alertas de Portfólio</p>
                    <p className="text-sm text-muted-foreground">
                      Enviado quando alertas são disparados
                    </p>
                  </div>
                  <Badge variant="outline">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates">
          <EmailTemplatesManager />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Emails Enviados</CardTitle>
              <CardDescription>
                Últimos emails transacionais enviados pela plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailLogs && emailLogs.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {emailLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            {new Date(log.sent_at).toLocaleString('pt-BR')}
                          </TableCell>
                          <TableCell>{log.recipient_email}</TableCell>
                          <TableCell>{log.email_type}</TableCell>
                          <TableCell>{log.subject}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'sent' 
                                ? 'bg-green-100 text-green-800' 
                                : log.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {log.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Info className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">Ver detalhes</p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum email enviado ainda</p>
                  <p className="text-sm mt-2">
                    Os emails aparecerão aqui quando forem enviados
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
