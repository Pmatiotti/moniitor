import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdvisorSelector } from "@/components/profile/AdvisorSelector";
import { PendingAdvisorInvitations } from "@/components/profile/PendingAdvisorInvitations";
import { CompleteProfileDialog } from "@/components/profile/CompleteProfileDialog";
import { WhatsAppNotificationSettings } from "@/components/profile/WhatsAppNotificationSettings";
import { User, Play, CreditCard, Edit } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useTourContext } from "@/contexts/TourContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  whatsapp_notifications_enabled: boolean;
}

const Profile = () => {
  const { startTour } = useTourContext();
  const navigate = useNavigate();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data as ProfileData;
    },
  });

  const handleProfileComplete = () => {
    setEditDialogOpen(false);
    refetch();
  };

  const handleStartTour = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ tour_completed: false })
        .eq('id', user.id);
    }
    toast.success("Iniciando tour da plataforma...");
    setTimeout(() => {
      startTour();
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <User className="h-8 w-8" />
            Meu Perfil
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais e configurações
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Seus dados cadastrados na plataforma
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
              <p className="text-lg">{profile?.full_name || 'Não informado'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">E-mail</label>
              <p className="text-lg">{profile?.email}</p>
            </div>
            {profile?.phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                <p className="text-lg">{profile.phone}</p>
              </div>
            )}
            {profile?.cpf && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">CPF</label>
                <p className="text-lg">{profile.cpf}</p>
              </div>
            )}
            {profile?.birth_date && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                <p className="text-lg">{new Date(profile.birth_date).toLocaleDateString('pt-BR')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {profile && (
          <WhatsAppNotificationSettings
            userId={profile.id}
            phone={profile.phone}
            whatsappEnabled={profile.whatsapp_notifications_enabled || false}
            onUpdate={refetch}
          />
        )}

        {/* Pending advisor invitations */}
        <PendingAdvisorInvitations />

        <Card>
          <CardHeader>
            <CardTitle>Meu Assessor</CardTitle>
            <CardDescription>
              Vinculação com assessores é feita por convite para garantir segurança
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdvisorSelector />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planos e Assinatura</CardTitle>
            <CardDescription>
              Gerencie seu plano e veja as opções disponíveis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/subscription')} className="w-full sm:w-auto">
              <CreditCard className="h-4 w-4 mr-2" />
              Ver Planos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tour da Plataforma</CardTitle>
            <CardDescription>
              Refaça o tour guiado para conhecer as principais funcionalidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartTour} className="w-full sm:w-auto">
              <Play className="h-4 w-4 mr-2" />
              Iniciar Tour Novamente
            </Button>
          </CardContent>
        </Card>
      </div>

      {profile && (
        <CompleteProfileDialog
          open={editDialogOpen}
          userId={profile.id}
          currentName={profile.full_name}
          currentPhone={profile.phone}
          currentCpf={profile.cpf}
          currentBirthDate={profile.birth_date}
          onComplete={handleProfileComplete}
          allowClose={true}
        />
      )}
    </AppLayout>
  );
};

export default Profile;
