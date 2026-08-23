import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { PlatformTour } from "@/components/tour/PlatformTour";
import { useTourContext } from "@/contexts/TourContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import { CompleteProfileDialog } from "@/components/profile/CompleteProfileDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayoutContent = ({ children }: AppLayoutProps) => {
  const { runTour, completeTour, userRole } = useTourContext();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const { lockSidebar, unlockSidebar } = useSidebarContext();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['profile-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile && !profile.profile_completed) {
      setShowProfileDialog(true);
    }
  }, [profile]);

  // Lock sidebar when tour is running
  useEffect(() => {
    if (runTour) {
      lockSidebar();
    } else {
      unlockSidebar();
    }
  }, [runTour, lockSidebar, unlockSidebar]);

  const handleProfileComplete = async () => {
    setShowProfileDialog(false);
    // Invalidate queries to refresh profile data
    await queryClient.invalidateQueries({ queryKey: ['profile-check'] });
    await queryClient.invalidateQueries({ queryKey: ['profile-tour'] });
  };

  const handleTourComplete = () => {
    unlockSidebar();
    completeTour();
  };

  return (
    <>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
          <ImpersonationBanner />
          <Header />
          <main className="flex-1 p-8 space-y-8 animate-fade-in overflow-x-hidden min-w-0">
            {children}
          </main>
        </div>
      </div>
      <PlatformTour run={runTour} onComplete={handleTourComplete} userRole={userRole} />
      
      {profile && !profile.profile_completed && (
        <CompleteProfileDialog
          open={showProfileDialog}
          userId={profile.id}
          currentName={profile.full_name}
          onComplete={handleProfileComplete}
        />
      )}
    </>
  );
};

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
};
