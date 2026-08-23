import { AppLayout } from "@/components/layout/AppLayout";
import { AdvisorPerformanceDashboard } from "@/components/crm/AdvisorPerformanceDashboard";
import { AssetTaxonomyManager } from "@/components/admin/AssetTaxonomyManager";
import { useIsManager } from "@/hooks/useUserRole";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Layers } from "lucide-react";

const Management = () => {
  const { isManager, isLoading } = useIsManager();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("performance");

  useEffect(() => {
    if (!isLoading && !isManager) {
      navigate("/dashboard");
    }
  }, [isManager, isLoading, navigate]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  if (!isManager) {
    return null;
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Escritório</h1>
          <p className="text-muted-foreground">
            Acompanhe métricas de performance e gerencie configurações do escritório
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="taxonomy" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Taxonomia de Ativos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4 mt-6">
            <AdvisorPerformanceDashboard />
          </TabsContent>

          <TabsContent value="taxonomy" className="space-y-4 mt-6">
            <AssetTaxonomyManager />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Management;