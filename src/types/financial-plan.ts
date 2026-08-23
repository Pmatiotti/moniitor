export interface PlanData {
  plan_type: string;
  title: string;
  description?: string;
  parameters: Record<string, string>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: string;
  }>;
}
