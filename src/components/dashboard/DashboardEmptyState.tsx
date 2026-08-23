import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  Building2, 
  Wallet, 
  Target,
  Plus,
  ArrowRight,
  FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddAssetDialog } from "@/components/portfolio/AddAssetDialog";
import { PluggyConnectionDialog } from "@/components/finances/PluggyConnectionDialog";
import { AddGoalDialog } from "@/components/goals/AddGoalDialog";

interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: () => void;
  actionLabel: string;
  variant?: 'default' | 'primary';
}

const QuickActionCard = ({ 
  icon, 
  title, 
  description, 
  action, 
  actionLabel,
  variant = 'default' 
}: QuickActionCardProps) => (
  <Card className={`
    group hover-lift cursor-pointer transition-all
    ${variant === 'primary' 
      ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30 hover:border-primary/50' 
      : 'hover:border-primary/30'
    }
  `}>
    <CardContent className="p-6">
      <div className="flex flex-col items-center text-center gap-4">
        <div className={`
          p-4 rounded-full transition-colors
          ${variant === 'primary' 
            ? 'bg-primary/20 text-primary group-hover:bg-primary/30' 
            : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
          }
        `}>
          {icon}
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Button 
          onClick={action}
          variant={variant === 'primary' ? 'default' : 'outline'}
          size="sm"
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-1" />
          {actionLabel}
        </Button>
      </div>
    </CardContent>
  </Card>
);

export const DashboardEmptyState = () => {
  const navigate = useNavigate();
  const [showAssetDialog, setShowAssetDialog] = useState(false);
  const [showPluggyDialog, setShowPluggyDialog] = useState(false);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome section */}
      <Card className="border-none bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="py-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold mb-2">
              Comece a organizar seu patrimônio 🚀
            </h2>
            <p className="text-muted-foreground">
              Adicione seus investimentos, conecte suas contas bancárias ou importe 
              dados do Imposto de Renda para ter uma visão completa das suas finanças.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          icon={<TrendingUp className="h-8 w-8" />}
          title="Adicionar Investimentos"
          description="Ações, FIIs, ETFs, Renda Fixa"
          action={() => setShowAssetDialog(true)}
          actionLabel="Adicionar ativo"
          variant="primary"
        />
        
        <QuickActionCard
          icon={<Building2 className="h-8 w-8" />}
          title="Cadastrar Patrimônio"
          description="Imóveis, veículos, participações"
          action={() => navigate('/patrimony')}
          actionLabel="Cadastrar"
        />
        
        <QuickActionCard
          icon={<Wallet className="h-8 w-8" />}
          title="Conectar Banco"
          description="Sincronize contas automaticamente"
          action={() => setShowPluggyDialog(true)}
          actionLabel="Conectar"
        />
        
        <QuickActionCard
          icon={<Target className="h-8 w-8" />}
          title="Criar Meta"
          description="Defina objetivos financeiros"
          action={() => setShowGoalDialog(true)}
          actionLabel="Criar meta"
        />
      </div>

      {/* Import from IR section */}
      <Card className="bg-muted/30">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold">Importar do Imposto de Renda</h3>
                <p className="text-sm text-muted-foreground">
                  Importe automaticamente seus bens declarados no IR
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate('/patrimony')}>
              Importar IR
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddAssetDialog 
        open={showAssetDialog} 
        onOpenChange={setShowAssetDialog}
        onSuccess={() => setShowAssetDialog(false)}
      />
      
      <PluggyConnectionDialog 
        open={showPluggyDialog} 
        onOpenChange={setShowPluggyDialog}
      />
      
      <AddGoalDialog 
        open={showGoalDialog} 
        onOpenChange={setShowGoalDialog}
        onSuccess={() => setShowGoalDialog(false)}
      />
    </div>
  );
};
