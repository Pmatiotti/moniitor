import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export type SubscriptionPlan = 'trial' | 'investor' | 'pro' | 'professional';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface SubscriptionData {
  subscribed: boolean;
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  trial_end?: string;
  current_period_end?: string;
  product_id?: string;
  subscription_end?: string;
}

export const PLAN_PRICES = {
  investor: 'price_1SpFNrQVZAXJJ8v6IJ6VayGk', // R$ 29,90
  pro: 'price_1SpFO7QVZAXJJ8v6hZlw8K4h',      // R$ 69,90
} as const;

export const useSubscription = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Check for session before enabling subscription query
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setHasSession(!!session);
      }
    );

    return () => authSub.unsubscribe();
  }, []);

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { subscribed: false } as SubscriptionData;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        throw error;
      }

      // Se não tiver assinatura, cria trial automaticamente
      if (!data.subscribed) {
        console.log('No subscription found, creating trial...');
        const { error: trialError } = await supabase.functions.invoke('create-trial-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (trialError) {
          console.error('Error creating trial:', trialError);
        } else {
          // Refetch para pegar o trial criado
          const { data: newData } = await supabase.functions.invoke('check-subscription', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          return newData as SubscriptionData;
        }
      }

      return data as SubscriptionData;
    },
    enabled: hasSession === true,
    refetchInterval: hasSession ? 60000 : false,
    refetchOnWindowFocus: hasSession === true,
  });

  const createCheckoutSession = useMutation({
    mutationFn: async (priceId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to subscribe');
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar sessão",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    },
  });

  const openCustomerPortal = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in');
      }

      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        // Se for erro de "não tem customer", lançar erro específico
        if (error.message?.includes('NO_CUSTOMER') || error.message?.includes('No Stripe customer')) {
          throw new Error('NEED_SUBSCRIPTION');
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Tente novamente";
      
      if (errorMessage === 'NEED_SUBSCRIPTION') {
        toast({
          title: "Assinatura necessária",
          description: "Você precisa assinar um plano antes de acessar o portal de gerenciamento.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao abrir portal",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  return {
    subscription,
    isLoading,
    refetch,
    createCheckoutSession,
    openCustomerPortal,
  };
};
