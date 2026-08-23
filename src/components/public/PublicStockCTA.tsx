import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Bell, PieChart, Target } from "lucide-react";

export function PublicStockCTA() {
  return (
    <Card className="mt-12 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="py-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            Gerencie seus investimentos com o MONIITOR
          </h2>
          <p className="text-muted-foreground mb-6">
            Consolide toda sua carteira, acompanhe dividendos, receba alertas 
            e tenha insights personalizados para tomar melhores decisões.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-full bg-primary/10">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Consolidação</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Análise</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-full bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Alertas</span>
            </div>
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="p-3 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Metas</span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/plans">
              <Button size="lg" className="w-full sm:w-auto">
                Começar Gratuitamente
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Saiba Mais
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
