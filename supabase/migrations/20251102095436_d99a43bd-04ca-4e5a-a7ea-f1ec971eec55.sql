-- Update email templates with variable syntax {{variableName}}

-- Update welcome_email template
UPDATE email_templates
SET 
  subject = 'Bem-vindo à sua jornada de investimentos!',
  html_content = '<!DOCTYPE html>
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
    <p class="footer">Email: {{userEmail}}<br>Equipe de Investimentos</p>
  </div>
</body>
</html>',
  variables = '["userName", "userEmail"]'::jsonb
WHERE template_key = 'welcome_email';

-- Update subscription_confirmation template
UPDATE email_templates
SET 
  subject = 'Assinatura Confirmada - Plano {{planName}}',
  html_content = '<!DOCTYPE html>
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
    <p>Aproveite todos os recursos da plataforma!</p>
    <p class="footer">Equipe de Investimentos</p>
  </div>
</body>
</html>',
  variables = '["userName", "planName", "planPrice", "nextBillingDate"]'::jsonb
WHERE template_key = 'subscription_confirmation';

-- Update goal_achieved template
UPDATE email_templates
SET 
  subject = '🎉 Parabéns! Você atingiu sua meta: {{goalName}}',
  html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Ubuntu, sans-serif; background-color: #f6f9fc; margin: 0; padding: 0; }
    .container { background-color: #ffffff; margin: 0 auto; padding: 20px 40px 48px; max-width: 600px; }
    h1 { color: #4CAF50; font-size: 28px; font-weight: bold; margin: 40px 0; text-align: center; }
    p { color: #333; font-size: 16px; line-height: 26px; margin: 16px 0; }
    .goal-box { background-color: #e8f5e9; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; }
    .goal-name { color: #2e7d32; font-size: 24px; font-weight: bold; margin: 0 0 16px 0; }
    .goal-value { color: #333; font-size: 20px; font-weight: 600; margin: 12px 0; }
    .goal-detail { color: #666; font-size: 14px; margin: 8px 0; }
    .footer { color: #8898aa; font-size: 12px; line-height: 16px; margin-top: 32px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 Meta Atingida!</h1>
    <p>Olá {{userName}},</p>
    <p>Parabéns! Você acabou de atingir sua meta:</p>
    <div class="goal-box">
      <p class="goal-name">{{goalName}}</p>
      <p class="goal-value">Valor: {{goalValue}}</p>
      <p class="goal-detail">Atingida em: {{achievedDate}}</p>
      <p class="goal-detail">Tempo para atingir: {{monthsToAchieve}} meses</p>
    </div>
    <p>Essa é uma grande conquista! Continue definindo novas metas e crescendo seu patrimônio.</p>
    <p class="footer">Equipe de Investimentos</p>
  </div>
</body>
</html>',
  variables = '["userName", "goalName", "goalValue", "achievedDate", "monthsToAchieve"]'::jsonb
WHERE template_key = 'goal_achieved';

-- Update renewal_reminder template
UPDATE email_templates
SET 
  subject = 'Lembrete: Sua assinatura será renovada em breve',
  html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
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
    </div>
    <div class="footer">
      <p>Este é um email automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>',
  variables = '["userName", "planType", "renewalDate"]'::jsonb
WHERE template_key = 'renewal_reminder';

-- Update monthly_report template (with array support)
UPDATE email_templates
SET 
  subject = 'Seu Relatório Mensal de Investimentos',
  html_content = '<!DOCTYPE html>
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
    .asset-list { list-style: none; padding: 0; }
    .asset-item { padding: 10px; margin: 5px 0; background: #f3f4f6; border-radius: 5px; display: flex; justify-content: space-between; }
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
      <div class="metric-card">
        <h3>Valor Total da Carteira</h3>
        <div class="metric-value">R$ {{portfolioValue}}</div>
      </div>
      <div class="metric-card">
        <h3>Retorno do Mês</h3>
        <div class="metric-value">{{monthlyReturn}}%</div>
      </div>
      <div class="metric-card">
        <h3>Melhores Ativos do Mês</h3>
        <ul class="asset-list">
          {{#each topAssets}}
          <li class="asset-item">
            <span>{{ticker}}</span>
            <span style="font-weight: bold;">{{return}}%</span>
          </li>
          {{/each}}
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>Este é um email automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>',
  variables = '["userName", "portfolioValue", "monthlyReturn", "topAssets"]'::jsonb
WHERE template_key = 'monthly_report';

-- Update portfolio_alerts template (with array support)
UPDATE email_templates
SET 
  subject = '⚠️ {{alertCount}} Alertas na Sua Carteira',
  html_content = '<!DOCTYPE html>
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
    .alert-type { display: inline-block; padding: 4px 12px; background: #fef3c7; color: #92400e; border-radius: 12px; font-size: 12px; font-weight: bold; }
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
      <p>Você tem <strong>{{alertCount}}</strong> alertas ativos em sua carteira:</p>
      {{#each alerts}}
      <div class="alert-card">
        <div class="alert-ticker">{{ticker}}</div>
        <span class="alert-type">{{alertType}}</span>
        <p><strong>Valor Atual:</strong> R$ {{currentValue}}</p>
        <p><strong>Limite Configurado:</strong> R$ {{threshold}}</p>
        <p>{{message}}</p>
      </div>
      {{/each}}
      <p>Fique atento às movimentações do mercado!</p>
    </div>
    <div class="footer">
      <p>Este é um email automático. Por favor, não responda.</p>
    </div>
  </div>
</body>
</html>',
  variables = '["userName", "alerts", "alertCount"]'::jsonb
WHERE template_key = 'portfolio_alerts';