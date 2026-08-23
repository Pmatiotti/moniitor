import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting goal alerts check...');

    // Get all active goals with deadlines
    const { data: goals, error: goalsError } = await supabase
      .from('financial_goals')
      .select('*')
      .eq('status', 'in_progress')
      .not('deadline', 'is', null);

    if (goalsError) throw goalsError;

    if (!goals || goals.length === 0) {
      console.log('No active goals with deadlines found');
      return new Response(
        JSON.stringify({ message: 'No goals to check', alertsCreated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${goals.length} goals to check`);

    let alertsCreated = 0;
    const today = new Date();

    for (const goal of goals as Goal[]) {
      const deadline = new Date(goal.deadline!);
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;

      console.log(`Checking goal: ${goal.title} (${goal.id})`);
      console.log(`  Days remaining: ${daysRemaining}, Progress: ${progress.toFixed(1)}%`);

      // Check if we should create alerts
      const alertsToCreate: Array<{
        alert_type: string;
        message: string;
        notificationType: string;
      }> = [];

      // Meta em risco - 30 days before deadline with <80% progress
      if (daysRemaining === 30 && progress < 80) {
        alertsToCreate.push({
          alert_type: 'goal_at_risk',
          message: `Atenção! Sua meta "${goal.title}" pode estar em risco. Faltam 30 dias e você está ${progress.toFixed(1)}% completo.`,
          notificationType: 'warning',
        });
      }

      // Meta próxima - 90, 60, 30 days
      if ([90, 60, 30].includes(daysRemaining)) {
        alertsToCreate.push({
          alert_type: 'goal_approaching',
          message: `Lembrete: Faltam ${daysRemaining} dias para a meta "${goal.title}". Progresso atual: ${progress.toFixed(1)}%.`,
          notificationType: 'info',
        });
      }

      // Meta superando expectativa - will complete 20% before deadline
      if (daysRemaining > 0 && progress >= 95 && progress < 100) {
        const estimatedDaysToComplete = progress > 90 
          ? Math.ceil((100 - progress) / (progress / (new Date().getTime() - new Date(goal.created_at).getTime()) / (1000 * 60 * 60 * 24)))
          : 0;
        
        const earlyByDays = daysRemaining - estimatedDaysToComplete;
        const earlyByPercent = daysRemaining > 0 ? (earlyByDays / daysRemaining) * 100 : 0;

        if (earlyByPercent >= 20) {
          alertsToCreate.push({
            alert_type: 'goal_ahead',
            message: `Parabéns! Você está à frente do planejado na meta "${goal.title}". Pode atingir a meta ${earlyByDays} dias antes!`,
            notificationType: 'success',
          });
        }
      }

      // Meta atingida
      if (progress >= 100) {
        alertsToCreate.push({
          alert_type: 'goal_completed',
          message: `🎉 Meta "${goal.title}" concluída! Parabéns por atingir seu objetivo!`,
          notificationType: 'success',
        });

        // Update goal status
        await supabase
          .from('financial_goals')
          .update({ status: 'completed' })
          .eq('id', goal.id);
      }

      // Meta vencida sem completar
      if (daysRemaining < 0 && progress < 100) {
        alertsToCreate.push({
          alert_type: 'goal_overdue',
          message: `A meta "${goal.title}" venceu. Progresso final: ${progress.toFixed(1)}%. Considere revisar sua meta.`,
          notificationType: 'warning',
        });
      }

      // Create alerts and notifications
      for (const alertData of alertsToCreate) {
        // Check if similar alert was created recently (last 24 hours)
        const oneDayAgo = new Date(today);
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);

        const { data: existingAlerts } = await supabase
          .from('alerts')
          .select('id')
          .eq('user_id', goal.user_id)
          .eq('goal_id', goal.id)
          .eq('alert_type', alertData.alert_type)
          .gte('created_at', oneDayAgo.toISOString());

        if (existingAlerts && existingAlerts.length > 0) {
          console.log(`  Skipping ${alertData.alert_type} - already created recently`);
          continue;
        }

        // Create alert
        const { error: alertError } = await supabase
          .from('alerts')
          .insert({
            user_id: goal.user_id,
            goal_id: goal.id,
            alert_type: alertData.alert_type,
            ticker: goal.title,
            is_active: true,
            notification_method: 'in_app',
          });

        if (alertError) {
          console.error(`  Error creating alert:`, alertError);
          continue;
        }

        // Create notification
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: goal.user_id,
            title: `Meta: ${goal.title}`,
            message: alertData.message,
            notification_type: alertData.notificationType,
            is_read: false,
          });

        if (notifError) {
          console.error(`  Error creating notification:`, notifError);
        } else {
          console.log(`  Created ${alertData.alert_type} alert`);
          alertsCreated++;
        }
      }
    }

    console.log(`Goal alerts check complete. Created ${alertsCreated} alerts`);

    return new Response(
      JSON.stringify({ 
        message: 'Goal alerts checked successfully', 
        goalsChecked: goals.length,
        alertsCreated 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error checking goal alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});