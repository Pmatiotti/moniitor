import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Asset {
  ticker: string;
  asset_name: string;
  asset_class: string;
  sub_class: string | null;
  quantity: number;
  average_price: number;
  current_price: number;
  broker: string | null;
  invested_amount: number | null;
}

interface Client {
  name: string;
  email: string;
  phone: string;
  risk_profile: string | null;
  investment_objectives: string | null;
  monthly_income: number | null;
}

export const generateClientPortfolioReport = (
  client: Client,
  assets: Asset[],
  advisorName: string = 'Assessor'
) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Relatório de Portfólio do Cliente', 14, 22);
  
  doc.setFontSize(10);
  doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);
  doc.text(`Assessor: ${advisorName}`, 14, 35);
  doc.text(`Cliente: ${client.name}`, 14, 40);
  
  // Client profile
  doc.setFontSize(12);
  doc.text('Perfil do Cliente', 14, 50);
  doc.setFontSize(10);
  
  let yPos = 57;
  if (client.email) {
    doc.text(`Email: ${client.email}`, 14, yPos);
    yPos += 5;
  }
  if (client.phone) {
    doc.text(`Telefone: ${client.phone}`, 14, yPos);
    yPos += 5;
  }
  if (client.risk_profile) {
    doc.text(`Perfil de Risco: ${client.risk_profile}`, 14, yPos);
    yPos += 5;
  }
  if (client.monthly_income) {
    doc.text(`Renda Mensal: R$ ${Number(client.monthly_income).toLocaleString('pt-BR')}`, 14, yPos);
    yPos += 5;
  }
  
  yPos += 5;
  
  // Calculate totals
  const totalInvested = assets.reduce((sum, asset) => {
    const usesInvested = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                         asset.invested_amount && Number(asset.invested_amount) > 0;
    return sum + (usesInvested 
      ? Number(asset.invested_amount) 
      : Number(asset.quantity) * Number(asset.average_price));
  }, 0);
  
  const totalCurrent = assets.reduce((sum, asset) => {
    const usesInvested = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                         asset.invested_amount && Number(asset.invested_amount) > 0;
    return sum + (usesInvested 
      ? Number(asset.current_price) 
      : Number(asset.current_price) * Number(asset.quantity));
  }, 0);
  
  const totalProfit = totalCurrent - totalInvested;
  const profitPercent = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;
  
  // Calculate allocation by class
  const allocationByClass = assets.reduce((acc, asset) => {
    const usesInvested = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                         asset.invested_amount && Number(asset.invested_amount) > 0;
    const value = usesInvested 
      ? Number(asset.current_price) 
      : Number(asset.current_price) * Number(asset.quantity);
    acc[asset.asset_class] = (acc[asset.asset_class] || 0) + value;
    return acc;
  }, {} as Record<string, number>);
  
  // Portfolio summary
  doc.setFontSize(12);
  doc.text('Resumo da Carteira', 14, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  doc.text(`Total Investido: R$ ${totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, yPos);
  yPos += 5;
  doc.text(`Valor Atual: R$ ${totalCurrent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 14, yPos);
  yPos += 5;
  
  const profitColor: [number, number, number] = totalProfit >= 0 ? [16, 185, 129] : [239, 68, 68];
  doc.setTextColor(profitColor[0], profitColor[1], profitColor[2]);
  doc.text(`Resultado: R$ ${totalProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${profitPercent.toFixed(2)}%)`, 14, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 10;
  
  // Allocation breakdown
  doc.setFontSize(12);
  doc.text('Alocação por Classe de Ativo', 14, yPos);
  yPos += 7;
  
  doc.setFontSize(10);
  Object.entries(allocationByClass).forEach(([assetClass, value]) => {
    const percentage = totalCurrent > 0 ? (value / totalCurrent) * 100 : 0;
    doc.text(`${assetClass}: R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage.toFixed(1)}%)`, 14, yPos);
    yPos += 5;
  });
  
  yPos += 5;
  
  // Assets table
  const tableData = assets.map(asset => {
    const usesInvested = (asset.asset_class === "Renda Fixa" || asset.asset_class === "Multimercado") && 
                         asset.invested_amount && Number(asset.invested_amount) > 0;
    
    const invested = usesInvested 
      ? Number(asset.invested_amount) 
      : Number(asset.quantity) * Number(asset.average_price);
      
    const current = usesInvested 
      ? Number(asset.current_price) 
      : Number(asset.current_price) * Number(asset.quantity);
      
    const profit = current - invested;
    const profitPct = invested > 0 ? (profit / invested) * 100 : 0;
    
    return [
      asset.ticker,
      asset.asset_name,
      asset.asset_class,
      asset.broker || '-',
      asset.quantity.toString(),
      `R$ ${Number(asset.average_price).toFixed(2)}`,
      `R$ ${current.toFixed(2)}`,
      `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(2)}%`
    ];
  });
  
  autoTable(doc, {
    startY: yPos,
    head: [['Ticker', 'Ativo', 'Classe', 'Corretora', 'Qtd', 'PM', 'Atual', 'Rentab.']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 7 },
    headStyles: { fillColor: [59, 130, 246] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 15 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 },
      7: { cellWidth: 20 }
    }
  });
  
  // Recommendations section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.text('Recomendações', 14, finalY);
  doc.setFontSize(9);
  
  let recoY = finalY + 7;
  
  // Check concentration
  const maxConcentration = Math.max(...Object.values(allocationByClass).map(v => (v / totalCurrent) * 100));
  if (maxConcentration > 40) {
    doc.text('• Alta concentração detectada. Considere diversificar a carteira.', 14, recoY);
    recoY += 5;
  }
  
  // Check diversification
  if (assets.length < 5 && totalCurrent > 50000) {
    doc.text('• Baixa diversificação. Recomenda-se aumentar o número de ativos.', 14, recoY);
    recoY += 5;
  }
  
  // Risk profile alignment
  if (client.risk_profile === 'conservador') {
    const variableIncome = (allocationByClass['Ações'] || 0) + (allocationByClass['FIIs'] || 0);
    const variablePct = totalCurrent > 0 ? (variableIncome / totalCurrent) * 100 : 0;
    if (variablePct > 30) {
      doc.text('• Alta exposição em renda variável para perfil conservador.', 14, recoY);
      recoY += 5;
    }
  }
  
  if (recoY === finalY + 7) {
    doc.text('• Carteira alinhada com o perfil de risco do cliente.', 14, recoY);
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Relatório gerado em ${new Date().toLocaleString('pt-BR')} | Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  doc.save(`relatorio-${client.name.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`);
};