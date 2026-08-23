import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'assessor' | 'cliente' | 'gestor';

// Hook to get all user roles
export const useUserRoles = () => {
  return useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching user roles:', error);
        return ['cliente' as UserRole];
      }

      return data?.map(r => r.role as UserRole) || ['cliente' as UserRole];
    },
  });
};

// Hook to get primary role (highest priority)
export const useUserRole = () => {
  return useQuery({
    queryKey: ['user-role'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching user role:', error);
        return 'cliente' as UserRole;
      }

      const roles = data?.map(r => r.role as UserRole) || [];
      
      // Return highest priority role
      if (roles.includes('admin')) return 'admin';
      if (roles.includes('gestor')) return 'gestor';
      if (roles.includes('assessor')) return 'assessor';
      return 'cliente';
    },
  });
};

export const useIsAdmin = () => {
  const { data: roles, isLoading } = useUserRoles();
  return { isAdmin: roles?.includes('admin') || false, isLoading };
};

export const useIsAdvisor = () => {
  const { data: roles, isLoading } = useUserRoles();
  return { 
    isAdvisor: roles?.includes('assessor') || roles?.includes('admin') || false, 
    isLoading 
  };
};

export const useIsManager = () => {
  const { data: roles, isLoading } = useUserRoles();
  return { 
    isManager: roles?.includes('gestor') || roles?.includes('admin') || false, 
    isLoading 
  };
};
