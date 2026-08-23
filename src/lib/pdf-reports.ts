import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Asset {
  ticker: string;
  asset_name: string;
  quantity: number;
  average_price: number;
  current_price: number;
}

interface Client {
  name: string;
  email: string;
  phone: string;
  status: string;
  portfolio_value: number;
}

export const generatePortfolioReport = (assets: Asset[], userName: string = 'Usuário') => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Relatório de Portfólio', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  doc.text(`Investidor: ${userName}`, 14, 35);
  
  // Calculate totals
  const totalInvested = assets.reduce((sum, asset) => 
    sum + (Number(asset.quantity) * Number(asset.average_price)), 0
  );
  const totalCurrent = assets.reduce((sum, asset) => 
    sum + (Number(asset.quantity) * Number(asset.current_price || asset.average_price)), 0
  );
  const totalProfit = totalCurrent - totalInvested;
  const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  
  // Summary
  doc.setFontSize(12);
  doc.text('Resumo Geral', 14, 45);
  doc.setFontSize(10);
  doc.text(`Total Investido: R$ ${totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 52);
  doc.text(`Valor Atual: R$ ${totalCurrent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 57);
  doc.text(`Lucro/Prejuízo: R$ ${totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${profitPercent.toFixed(2)}%)`, 14, 62);
  
  // Assets table
  const tableData = assets.map(asset => {
    const invested = Number(asset.quantity) * Number(asset.average_price);
    const current = Number(asset.quantity) * Number(asset.current_price || asset.average_price);
    const profit = current - invested;
    const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
    
    return [
      asset.ticker,
      asset.asset_name,
      asset.quantity.toString(),
      `R$ ${Number(asset.average_price).toFixed(2)}`,
      `R$ ${Number(asset.current_price || asset.average_price).toFixed(2)}`,
      `R$ ${invested.toFixed(2)}`,
      `R$ ${current.toFixed(2)}`,
      `${profitPct.toFixed(2)}%`
    ];
  });
  
  autoTable(doc, {
    startY: 70,
    head: [['Ticker', 'Ativo', 'Qtd', 'Preço Médio', 'Preço Atual', 'Investido', 'Atual', 'Rentab.']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`relatorio-portfolio-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateCRMReport = (clients: Client[], advisorName: string = 'Assessor') => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Relatório de CRM', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  doc.text(`Assessor: ${advisorName}`, 14, 35);
  
  // Statistics
  const totalClients = clients.length;
  const activeClients = clients.filter(c => c.status === 'active').length;
  const prospects = clients.filter(c => c.status === 'prospect').length;
  const totalAUM = clients.reduce((sum, c) => sum + Number(c.portfolio_value || 0), 0);
  
  doc.setFontSize(12);
  doc.text('Estatísticas', 14, 45);
  doc.setFontSize(10);
  doc.text(`Total de Clientes: ${totalClients}`, 14, 52);
  doc.text(`Clientes Ativos: ${activeClients}`, 14, 57);
  doc.text(`Prospects: ${prospects}`, 14, 62);
  doc.text(`Patrimônio Total: R$ ${totalAUM.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 67);
  
  // Clients table
  const tableData = clients.map(client => [
    client.name,
    client.email || '-',
    client.phone || '-',
    client.status,
    `R$ ${Number(client.portfolio_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  ]);
  
  autoTable(doc, {
    startY: 75,
    head: [['Nome', 'Email', 'Telefone', 'Status', 'Patrimônio']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`relatorio-crm-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generatePerformanceReport = (metrics: any, userName: string = 'Usuário') => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Relatório de Performance', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  doc.text(`Investidor: ${userName}`, 14, 35);
  
  // Performance metrics
  doc.setFontSize(12);
  doc.text('Métricas de Performance', 14, 45);
  
  doc.setFontSize(10);
  doc.text(`Valor Total: R$ ${metrics.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 55);
  doc.text(`Total Investido: R$ ${metrics.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 62);
  doc.text(`Lucro/Prejuízo: R$ ${metrics.totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, 69);
  doc.text(`Retorno Total: ${metrics.totalReturn.toFixed(2)}%`, 14, 76);
  doc.text(`Retorno Anual: ${metrics.annualReturn.toFixed(2)}%`, 14, 83);
  doc.text(`Volatilidade: ${metrics.volatility.toFixed(2)}%`, 14, 90);
  doc.text(`Índice Sharpe: ${metrics.sharpeRatio.toFixed(2)}`, 14, 97);
  doc.text(`Drawdown Máximo: ${metrics.maxDrawdown.toFixed(2)}%`, 14, 104);
  
  // Risk assessment
  doc.setFontSize(12);
  doc.text('Análise de Risco', 14, 120);
  
  doc.setFontSize(10);
  const riskLevel = metrics.volatility < 15 ? 'Baixo' : metrics.volatility < 25 ? 'Moderado' : 'Alto';
  doc.text(`Nível de Risco: ${riskLevel}`, 14, 130);
  
  if (metrics.sharpeRatio > 1) {
    doc.text('Retorno ajustado ao risco: Excelente', 14, 137);
  } else if (metrics.sharpeRatio > 0.5) {
    doc.text('Retorno ajustado ao risco: Bom', 14, 137);
  } else {
    doc.text('Retorno ajustado ao risco: Moderado', 14, 137);
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`relatorio-performance-${new Date().toISOString().split('T')[0]}.pdf`);
};
