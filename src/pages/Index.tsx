import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DollarSign, BarChart3 } from "lucide-react";
import PublicNavbar from "@/components/layout/PublicNavbar";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      <PublicNavbar />

      <main className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
          <h2 className="text-5xl font-bold text-foreground">
            Gestão Patrimonial Inteligente
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Consolide seus investimentos, acompanhe proventos e tome decisões baseadas em dados reais.
          </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-16">
            <div className="p-6 rounded-lg bg-card border border-border/50">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Consolidação Patrimonial</h3>
              <p className="text-sm text-muted-foreground">
                Visualize toda sua carteira multi-corretora em um só lugar com análise detalhada por classe de ativo
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border/50">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Acompanhamento de Proventos</h3>
              <p className="text-sm text-muted-foreground">
                Registre e projete dividendos, JCP e rendimentos com histórico completo e calendário
              </p>
            </div>

          </div>

          <div className="flex justify-center mt-12">
            <Button size="lg" onClick={() => navigate("/plans")}>
              Começar Agora
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
