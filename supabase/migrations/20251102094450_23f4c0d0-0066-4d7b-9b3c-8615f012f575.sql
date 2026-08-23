-- Create table for email templates
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage email templates"
ON public.email_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default templates
INSERT INTO public.email_templates (template_key, name, description, subject, html_content, variables) VALUES
(
  'welcome',
  'Email de Boas-Vindas',
  'Enviado quando um novo usuário se cadastra',
  'Bem-vindo à sua jornada de investimentos!',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 20px 40px 48px; max-width: 600px; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; }
    p { color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .section { margin: 24px 0; }
    .section-title { color: #333; font-size: 18px; font-weight: 600; margin: 16px 0; }
    ul { margin: 8px 0; padding: 0 0 0 20px; }
    li { color: #333; font-size: 16px; line-height: 26px; margin: 8px 0; }
    .footer { color: #8898aa; font-size: 12px; line-height: 16px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Bem-vindo, {{userName}}! 🎉</h1>
    
    <p>Estamos muito felizes em tê-lo conosco! Sua conta foi criada com sucesso.</p>

    <div class="section">
      <p class="section-title">Primeiros Passos:</p>
      <ul>
        <li>📊 Adicione seus primeiros ativos ao portfólio</li>
        <li>🎯 Defina suas metas financeiras</li>
        <li>📈 Acompanhe a evolução do seu patrimônio</li>
        <li>🔔 Configure alertas personalizados</li>
      </ul>
    </div>

    <p>Se tiver dúvidas, nossa equipe está sempre disponível para ajudar.</p>

    <p class="footer">
      Email: {{userEmail}}<br>
      Equipe de Investimentos
    </p>
  </div>
</body>
</html>',
  '["userName", "userEmail"]'::jsonb
),
(
  'subscription_confirmation',
  'Confirmação de Assinatura',
  'Enviado quando uma assinatura é confirmada',
  'Assinatura Confirmada - Plano {{planName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 20px 40px 48px; max-width: 600px; }
    h1 { color: #333; font-size: 24px; font-weight: bold; margin: 40px 0; }
    p { color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .details-box { background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .detail-title { color: #333; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; }
    .detail { color: #333; font-size: 16px; line-height: 24px; margin: 8px 0; }
    .section { margin: 24px 0; }
    .section-title { color: #333; font-size: 18px; font-weight: 600; margin: 16px 0; }
    ul { margin: 8px 0; padding: 0 0 0 20px; }
    li { color: #333; font-size: 16px; line-height: 26px; margin: 8px 0; }
    .footer { color: #8898aa; font-size: 12px; line-height: 16px; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Assinatura Confirmada! ✅</h1>
    
    <p>Olá {{userName}},</p>

    <p>Sua assinatura do <strong>Plano {{planName}}</strong> foi confirmada com sucesso!</p>

    <div class="details-box">
      <p class="detail-title">Detalhes da Assinatura:</p>
      <p class="detail"><strong>Plano:</strong> {{planName}}</p>
      <p class="detail"><strong>Valor:</strong> {{planPrice}}</p>
      <p class="detail"><strong>Próxima cobrança:</strong> {{nextBillingDate}}</p>
    </div>

    <div class="section">
      <p class="section-title">O que você pode fazer agora:</p>
      <ul>
        <li>📊 Acesso completo a análises fundamentalistas</li>
        <li>🎯 Metas ilimitadas</li>
        <li>📈 Relatórios avançados</li>
        <li>🔔 Alertas personalizados</li>
      </ul>
    </div>

    <p>Aproveite todos os recursos da plataforma!</p>

    <p class="footer">Equipe de Investimentos</p>
  </div>
</body>
</html>',
  '["userName", "planName", "planPrice", "nextBillingDate"]'::jsonb
),
(
  'goal_achieved',
  'Meta Atingida',
  'Enviado quando o usuário atinge uma meta financeira',
  '🎉 Parabéns! Você atingiu sua meta: {{goalName}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 20px 40px 48px; max-width: 600px; }
    h1 { color: #4CAF50; font-size: 28px; font-weight: bold; margin: 40px 0; text-align: center; }
    p { color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .celebration-text { color: #333; font-size: 18px; line-height: 28px; margin: 24px 0; font-weight: 500; }
    .goal-box { background-color: #e8f5e9; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
    .goal-name { color: #2e7d32; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; }
    .goal-value { color: #333; font-size: 20px; font-weight: 600; margin: 12px 0; }
    .goal-detail { color: #666; font-size: 14px; margin: 8px 0; }
    .motivation-box { background-color: #fff8e1; border-left: 4px solid #ffc107; border-radius: 4px; padding: 16px; margin: 24px 0; }
    .motivation-text { color: #666; font-size: 16px; font-style: italic; margin: 0; text-align: center; }
    .footer { color: #8898aa; font-size: 12px; line-height: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 Meta Atingida!</h1>
    
    <p>Olá {{userName}},</p>

    <p class="celebration-text">Parabéns! Você acabou de atingir sua meta:</p>

    <div class="goal-box">
      <p class="goal-name">{{goalName}}</p>
      <p class="goal-value">Valor: {{goalValue}}</p>
      <p class="goal-detail">Atingida em: {{achievedDate}}</p>
      <p class="goal-detail">Tempo para atingir: {{monthsToAchieve}}</p>
    </div>

    <p>Essa é uma grande conquista! Continue definindo novas metas e crescendo seu patrimônio.</p>

    <div class="motivation-box">
      <p class="motivation-text">"O sucesso é a soma de pequenos esforços repetidos dia após dia."</p>
    </div>

    <p class="footer">Equipe de Investimentos</p>
  </div>
</body>
</html>',
  '["userName", "goalName", "goalValue", "achievedDate", "monthsToAchieve"]'::jsonb
),
(
  'renewal_reminder',
  'Lembrete de Renovação',
  'Enviado antes da renovação de assinatura',
  'Lembrete: Sua assinatura será renovada em breve',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
      .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🔔 Lembrete de Renovação</h1>
      </div>
      <div class="content">
        <p>Olá <strong>{{userName}}</strong>,</p>
        
        <p>Sua assinatura do plano <strong>{{planType}}</strong> será renovada em breve!</p>
        
        <p><strong>Data de renovação:</strong> {{renewalDate}}</p>
        
        <p>Caso deseje fazer alguma alteração no seu plano ou método de pagamento, acesse sua conta antes da data de renovação.</p>
        
        <p>Se tiver alguma dúvida, nossa equipe está à disposição para ajudar.</p>
        
        <p>Obrigado por continuar conosco!</p>
      </div>
      <div class="footer">
        <p>Este é um email automático. Por favor, não responda.</p>
        <p>© Investimentos. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
</html>',
  '["userName", "planType", "renewalDate"]'::jsonb
),
(
  'monthly_report',
  'Relatório Mensal',
  'Enviado mensalmente com resumo da carteira',
  'Seu Relatório Mensal de Investimentos',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .metric-card { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .metric-value { font-size: 32px; font-weight: bold; color: #667eea; }
      .return-value { font-size: 24px; font-weight: bold; }
      .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>📊 Relatório Mensal de Investimentos</h1>
      </div>
      <div class="content">
        <p>Olá <strong>{{userName}}</strong>,</p>
        
        <p>Aqui está o resumo do desempenho da sua carteira no último mês:</p>
        
        <div class="metric-card">
          <h3>Valor Total da Carteira</h3>
          <div class="metric-value">{{portfolioValue}}</div>
        </div>
        
        <div class="metric-card">
          <h3>Retorno do Mês</h3>
          <div class="return-value">{{monthlyReturn}}%</div>
        </div>
        
        <p>Continue acompanhando seus investimentos para tomar as melhores decisões!</p>
      </div>
      <div class="footer">
        <p>Este é um email automático. Por favor, não responda.</p>
        <p>© Investimentos. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
</html>',
  '["userName", "portfolioValue", "monthlyReturn"]'::jsonb
),
(
  'portfolio_alerts',
  'Alertas de Carteira',
  'Enviado quando há alertas ativos na carteira',
  '⚠️ Alertas na Sua Carteira',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
      .alert-card { background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #f59e0b; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
      .alert-ticker { font-size: 20px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
      .alert-type { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 10px; }
      .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>⚠️ Alertas da Sua Carteira</h1>
      </div>
      <div class="content">
        <p>Olá <strong>{{userName}}</strong>,</p>
        
        <p>Você tem alertas ativos em sua carteira que requerem sua atenção.</p>
        
        <p>Fique atento às movimentações do mercado e tome as melhores decisões!</p>
      </div>
      <div class="footer">
        <p>Este é um email automático. Por favor, não responda.</p>
        <p>© Investimentos. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
</html>',
  '["userName"]'::jsonb
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_email_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_email_template_updated_at();