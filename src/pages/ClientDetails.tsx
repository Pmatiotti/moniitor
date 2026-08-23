import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/pages/CRM";
import { ClientDetailsContent } from "@/components/crm/ClientDetailsContent";
import { EditClientDialog } from "@/components/crm/EditClientDialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";

const ClientDetails = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isLinkedClient, setIsLinkedClient] = useState(false);

  useEffect(() => {
    const fetchClient = async () => {
      if (!clientId) {
        setError("ID do cliente não fornecido");
        setLoading(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Usuário não autenticado");
          setLoading(false);
          return;
        }

        // 1. Tentar buscar cliente manual primeiro
        const { data: manualClient, error: manualError } = await supabase
          .from("clients")
          .select("*")
          .eq("id", clientId)
          .maybeSingle();

        if (manualError && manualError.code !== 'PGRST116') {
          throw manualError;
        }

        if (manualClient) {
          setClient(manualClient as Client);
          setIsLinkedClient(false);
          setLoading(false);
          return;
        }

        // 2. Se não encontrou, verificar se é cliente vinculado
        const { data: link, error: linkError } = await supabase
          .from("client_advisor_links")
          .select("client_id, status")
          .eq("advisor_id", user.id)
          .eq("client_id", clientId)
          .eq("status", "active")
          .maybeSingle();

        if (linkError) {
          throw linkError;
        }

        if (!link) {
          setError("Cliente não encontrado");
          setLoading(false);
          return;
        }

        // 3. Buscar profile do cliente vinculado
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone")
          .eq("id", clientId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!profile) {
          setError("Perfil do cliente não encontrado");
          setLoading(false);
          return;
        }

        // 4. Buscar assets para calcular portfolio_value
        const { data: assets } = await supabase
          .from("assets")
          .select("quantity, current_price, average_price")
          .eq("user_id", profile.id);

        const portfolioValue = (assets || []).reduce((sum, asset) => {
          const price = Number(asset.current_price) || Number(asset.average_price) || 0;
          const qty = Number(asset.quantity) || 0;
          return sum + (price * qty);
        }, 0);

        // 5. Montar objeto Client a partir do profile
        const linkedClient: Client = {
          id: profile.id,
          name: profile.full_name || profile.email?.split('@')[0] || 'Sem nome',
          email: profile.email || '',
          phone: profile.phone || '',
          status: 'active',
          portfolio_value: portfolioValue,
          notes: '',
          risk_profile: null,
          investment_objectives: null,
          monthly_income: null,
          onboarding_date: null,
          last_portfolio_update: null,
        };

        setClient(linkedClient);
        setIsLinkedClient(true);
      } catch (err: any) {
        console.error("Erro ao buscar cliente:", err);
        setError(err.message || "Erro ao carregar dados do cliente");
      } finally {
        setLoading(false);
      }
    };

    fetchClient();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">{error || "Cliente não encontrado"}</p>
        <Button onClick={() => navigate("/crm")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao CRM
        </Button>
      </div>
    );
  }

  const handleEditSuccess = async () => {
    if (!clientId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (!isLinkedClient) {
      // Refetch cliente manual
      const { data } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .maybeSingle();
      if (data) {
        setClient(data as Client);
      }
    } else {
      // Refetch cliente vinculado
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("id", clientId)
        .maybeSingle();

      if (profile) {
        const { data: assets } = await supabase
          .from("assets")
          .select("quantity, current_price, average_price")
          .eq("user_id", profile.id);

        const portfolioValue = (assets || []).reduce((sum, asset) => {
          const price = Number(asset.current_price) || Number(asset.average_price) || 0;
          const qty = Number(asset.quantity) || 0;
          return sum + (price * qty);
        }, 0);

        setClient({
          ...client!,
          name: profile.full_name || profile.email?.split('@')[0] || 'Sem nome',
          email: profile.email || '',
          phone: profile.phone || '',
          portfolio_value: portfolioValue,
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 border-b">
        <div className="p-4 max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/crm")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao CRM
          </Button>
          <span className="text-muted-foreground">|</span>
          <h1 className="font-semibold">{client.name}</h1>
        </div>
      </div>
      <ClientDetailsContent 
        client={client} 
        isFullPage 
        onEdit={() => setEditDialogOpen(true)} 
      />

      <EditClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        client={client}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
};

export default ClientDetails;
