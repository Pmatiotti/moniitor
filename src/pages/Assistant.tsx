import { AppLayout } from "@/components/layout/AppLayout";
import { AIAssistant } from "@/components/dashboard/AIAssistant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertCircle, MessageSquare } from "lucide-react";

const Assistant = () => {
  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Assistente IA</h1>
          <p className="text-muted-foreground">Análise inteligente da sua carteira com IA</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-6">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Análise de Carteira</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Análise completa dos seus investimentos com insights personalizados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Sugestões</CardTitle>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Recomendações de diversificação e oportunidades
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Alertas & Riscos</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Identificação de riscos e alertas importantes
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AIAssistant />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Exemplos de perguntas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-sm">Como está a diversificação da minha carteira?</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-sm">Qual ativo tem maior participação?</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-sm">Quais são os meus proventos recentes?</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-sm">Sugira melhorias para minha carteira</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border/30 hover:border-primary/30 transition-colors cursor-pointer">
                  <p className="text-sm">Qual meu lucro/prejuízo total?</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm">💡 Dica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  O assistente tem acesso a todos os dados da sua carteira em tempo real.
                  Faça perguntas específicas para obter análises detalhadas!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Assistant;
