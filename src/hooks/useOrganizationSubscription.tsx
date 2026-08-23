import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OrganizationSubscription {
  plan_type: string;
  status: string;
  max_users: number;
  current_period_end: string;
}

export const useOrganizationSubscription = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['organization-subscription', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;

      const { data, error } = await supabase
        .rpc('get_organization_subscription', { _organization_id: organizationId });

      if (error) {
        console.error('Error fetching organization subscription:', error);
        return null;
      }

      return data?.[0] as OrganizationSubscription | null;
    },
    enabled: !!organizationId,
  });
};

export const useOrganizationUserCount = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['organization-user-count', organizationId],
    queryFn: async () => {
      if (!organizationId) return 0;

      const { data, error } = await supabase
        .rpc('count_organization_users', { _organization_id: organizationId });

      if (error) {
        console.error('Error counting organization users:', error);
        return 0;
      }

      return data as number;
    },
    enabled: !!organizationId,
  });
};

export const useCanOrganizationAddUser = (organizationId: string | null) => {
  return useQuery({
    queryKey: ['can-organization-add-user', organizationId],
    queryFn: async () => {
      if (!organizationId) return false;

      const { data, error } = await supabase
        .rpc('can_organization_add_user', { _organization_id: organizationId });

      if (error) {
        console.error('Error checking if can add user:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!organizationId,
  });
};
