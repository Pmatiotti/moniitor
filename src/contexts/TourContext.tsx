import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, UserRole } from "@/hooks/useUserRole";

interface TourContextType {
  runTour: boolean;
  startTour: () => void;
  completeTour: () => void;
  userRole: UserRole;
  isLoading: boolean;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const [runTour, setRunTour] = useState(false);
  const { data: role, isLoading: isRoleLoading } = useUserRole();

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['profile-tour'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('tour_completed, profile_completed')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const isLoading = isProfileLoading || isRoleLoading;

  useEffect(() => {
    // Only start tour if profile is completed AND tour hasn't been completed
    if (!isLoading && profile && !profile.tour_completed && profile.profile_completed) {
      const timer = setTimeout(() => {
        setRunTour(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [profile, isLoading]);

  const startTour = useCallback(() => {
    setRunTour(true);
  }, []);

  const completeTour = useCallback(() => {
    setRunTour(false);
  }, []);

  return (
    <TourContext.Provider
      value={{
        runTour,
        startTour,
        completeTour,
        userRole: (role || 'cliente') as UserRole,
        isLoading,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};

export const useTourContext = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTourContext must be used within a TourProvider");
  }
  return context;
};
