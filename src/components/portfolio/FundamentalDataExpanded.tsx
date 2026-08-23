import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, TrendingUp } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { IndicatorHistoryDialog } from "./IndicatorHistoryDialog";

interface FundamentalDataExpandedProps {
  data: any;
  isFII: boolean;
}

const indicatorExplanations: Record<string, string> = {
  // FIIs
  "Liquidez Média Diária": "Volume médio diário negociado do FII em reais",
  "Último Rendimento": "Valor do último rendimento distribuído aos cotistas",
  "Dividend Yield": "Rendimento anual em percentual baseado nos dividendos distribuídos",
  "Patrimônio Líquido": "Valor total dos ativos menos os passivos do fundo",
  "Valor Patrimonial": "Valor patrimonial por cota do fundo",
  "Rentab. no mês": "Rentabilidade percentual da cota no último mês",
  "P/VP": "Preço sobre Valor Patrimonial - Compara o preço da cota com seu valor patrimonial",
  "Data Últ. Dividendo": "Data do último pagamento de dividendos",
  
  // Valuation
  "D.Y": "Dividend Yield - Rendimento de dividendos em percentual anual",
  "P/L": "Preço sobre Lucro - Quantos anos levaria para recuperar o investimento com base no lucro atual",
  "PEG RATIO": "P/L dividido pela taxa de crescimento - Avalia se a ação está cara ou barata considerando crescimento",
  "EV/EBITDA": "Valor da Empresa sobre EBITDA - Múltiplo de avaliação considerando dívidas",
  "P/EBITDA": "Preço sobre EBITDA - Similar ao P/L mas usando EBITDA ao invés do lucro líquido",
  "P/EBIT": "Preço sobre EBIT - Preço da ação dividido pelo lucro operacional",
  "P/ATIVO": "Preço sobre Ativo Total - Indica quanto o mercado paga por cada real em ativos da empresa",
  "P/CAP. GIRO": "Preço sobre Capital de Giro - Avalia quanto o mercado paga pelo capital de giro da empresa",
  "P/ATIVO CIRC. LIQ.": "Preço sobre Ativo Circulante Líquido - Mede o preço em relação aos ativos de curto prazo menos passivos de curto prazo",
  
  // Endividamento
  "DÍV. LÍQUIDA/PL": "Dívida Líquida sobre Patrimônio Líquido - Nível de endividamento em relação ao patrimônio",
  "DÍV. LÍQUIDA/EBITDA": "Dívida Líquida sobre EBITDA - Quantos anos de EBITDA são necessários para pagar a dívida líquida",
  "DÍV. LÍQUIDA/EBIT": "Dívida Líquida sobre EBIT - Similar ao anterior mas usando EBIT",
  "PL/ATIVOS": "Patrimônio Líquido sobre Ativos Totais - Proporção dos ativos financiada pelo patrimônio próprio",
  "PASSIVOS/ATIVOS": "Passivos sobre Ativos Totais - Proporção dos ativos financiada por dívidas",
  "LIQ. CORRENTE": "Liquidez Corrente - Capacidade de pagar dívidas de curto prazo com ativos de curto prazo",
  
  // Eficiência
  "M. BRUTA": "Margem Bruta - Percentual de lucro após deduzir custos diretos de produção",
  "M. EBITDA": "Margem EBITDA - Lucratividade operacional antes de juros, impostos, depreciação e amortização",
  "M. EBIT": "Margem EBIT - Lucratividade operacional antes de juros e impostos",
  "M. LÍQUIDA": "Margem Líquida - Percentual do lucro líquido em relação à receita total",
  "GIRO ATIVOS": "Giro de Ativos - Eficiência da empresa em gerar receita a partir de seus ativos",
  
  // Rentabilidade
  "ROE": "Return on Equity - Retorno sobre o Patrimônio Líquido, mede a rentabilidade do capital próprio",
  "ROA": "Return on Assets - Retorno sobre Ativos, mede quão eficientemente os ativos geram lucro",
  "ROIC": "Return on Invested Capital - Retorno sobre o Capital Investido, avalia a eficiência do uso do capital",
  
  // Crescimento
  "CAGR RECEITAS 5 ANOS": "Taxa de Crescimento Anual Composta das receitas nos últimos 5 anos",
  "CAGR LUCROS 5 ANOS": "Taxa de Crescimento Anual Composta dos lucros nos últimos 5 anos"
};

// Indicators that have historical data available (from annual_fundamentals)
const indicatorsWithHistory: Record<string, { key: string; isPercentage: boolean }> = {
  // Margens (Eficiência)
  "M. BRUTA": { key: "gross_margin", isPercentage: true },
  "M. EBITDA": { key: "ebitda_margin", isPercentage: true },
  "M. EBIT": { key: "ebit_margin", isPercentage: true },
  "M. LÍQUIDA": { key: "net_margin", isPercentage: true },
  
  // Rentabilidade
  "ROE": { key: "roe", isPercentage: true },
  "ROA": { key: "roa", isPercentage: true },
  "ROIC": { key: "roic", isPercentage: true },
  
  // Valuation
  "D.Y": { key: "dividend_yield", isPercentage: true },
  "P/L": { key: "p_l", isPercentage: false },
  "P/VP": { key: "p_vp", isPercentage: false },
  "EV/EBITDA": { key: "ev_ebitda", isPercentage: false },
  
  // Endividamento
  "DÍV. LÍQUIDA/EBITDA": { key: "div_liquida_ebitda", isPercentage: false },
  "LIQ. CORRENTE": { key: "liq_corrente", isPercentage: false },
  
  // Crescimento
  "CAGR RECEITAS 5 ANOS": { key: "cagr_receitas_5a", isPercentage: true },
  "CAGR LUCROS 5 ANOS": { key: "cagr_lucros_5a", isPercentage: true },
  
  // Valores absolutos (histórico de evolução)
  "RECEITA": { key: "revenue", isPercentage: false },
  "LUCRO LÍQUIDO": { key: "net_income", isPercentage: false },
  "EBITDA": { key: "ebitda", isPercentage: false },
};

export const FundamentalDataExpanded = ({ data, isFII }: FundamentalDataExpandedProps) => {
  const [selectedIndicator, setSelectedIndicator] = useState<{
    key: string;
    label: string;
    isPercentage: boolean;
  } | null>(null);

  const formatNumber = (value?: number, decimals = 2) => {
    if (!value) return '-';
    return value.toFixed(decimals);
  };

  const formatPercent = (value?: number, decimals = 2) => {
    if (value === null || value === undefined) return '-';
    // Database stores percentages as decimals (0.xx), multiply by 100 for display
    return `${(value * 100).toFixed(decimals)}%`;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handleIndicatorClick = (label: string) => {
    const historyInfo = indicatorsWithHistory[label];
    if (historyInfo) {
      setSelectedIndicator({
        key: historyInfo.key,
        label,
        isPercentage: historyInfo.isPercentage,
      });
    }
  };

  const IndicatorWithTooltip = ({ label, value }: { label: string; value: string }) => {
    const hasHistory = !!indicatorsWithHistory[label];
    
    return (
      <button
        onClick={() => handleIndicatorClick(label)}
        disabled={!hasHistory}
        className={`bg-muted/30 rounded-lg p-4 border border-border/50 transition-all text-left w-full
          ${hasHistory 
            ? 'hover:border-primary/50 hover:bg-muted/50 hover:shadow-md cursor-pointer group' 
            : 'cursor-default'
          }`}
      >
        <p className="text-base text-muted-foreground flex items-center gap-2 mb-2 font-medium">
          {label}
          <span className="flex items-center gap-1">
            {indicatorExplanations[label] && (
              <HoverCard>
                <HoverCardTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <HelpCircle className="h-4 w-4 cursor-help opacity-60 hover:opacity-100 transition-opacity" />
                </HoverCardTrigger>
                <HoverCardContent className="w-80">
                  <p className="text-sm">{indicatorExplanations[label]}</p>
                </HoverCardContent>
              </HoverCard>
            )}
            {hasHistory && (
              <TrendingUp className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            )}
          </span>
        </p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {hasHistory && (
          <p className="text-xs text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            Clique para ver histórico
          </p>
        )}
      </button>
    );
  };

  const ticker = data?.ticker || '';

  if (isFII) {
    return (
      <div className="space-y-6 mt-4">
        {/* Indicadores Principais de FIIs */}
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold tracking-wide">Indicadores do FII</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <IndicatorWithTooltip label="Liquidez Média Diária" value={formatCurrency(data.liquidez_media_diaria)} />
            <IndicatorWithTooltip label="Último Rendimento" value={formatCurrency(data.ultimo_rendimento)} />
            <IndicatorWithTooltip label="Dividend Yield" value={formatPercent(data.dy)} />
            <IndicatorWithTooltip label="Patrimônio Líquido" value={formatCurrency(data.patrimonio_liquido)} />
            <IndicatorWithTooltip label="Valor Patrimonial" value={formatCurrency(data.valor_patrimonial)} />
            <IndicatorWithTooltip label="Rentab. no mês" value={formatPercent(data.rentabilidade_mes)} />
            <IndicatorWithTooltip label="P/VP" value={formatNumber(data.p_vp)} />
            <IndicatorWithTooltip label="Data Últ. Dividendo" value={data.data_ultimo_dividendo || '-'} />
          </CardContent>
        </Card>

        {/* Dialog for historical data */}
        {selectedIndicator && (
          <IndicatorHistoryDialog
            isOpen={!!selectedIndicator}
            onClose={() => setSelectedIndicator(null)}
            ticker={ticker}
            indicatorKey={selectedIndicator.key}
            indicatorLabel={selectedIndicator.label}
            isPercentage={selectedIndicator.isPercentage}
          />
        )}
      </div>
    );
  }

  // Indicadores para ações
  return (
    <div className="space-y-6 mt-4">
      {/* Indicadores de Valuation */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-orange-600 tracking-wide">INDICADORES DE VALUATION</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IndicatorWithTooltip label="D.Y" value={formatPercent(data.dy)} />
          <IndicatorWithTooltip label="P/L" value={formatNumber(data.p_l)} />
          <IndicatorWithTooltip label="PEG RATIO" value={formatNumber(data.peg_ratio)} />
          <IndicatorWithTooltip label="P/VP" value={formatNumber(data.p_vp)} />
          <IndicatorWithTooltip label="EV/EBITDA" value={formatNumber(data.ev_ebitda)} />
          <IndicatorWithTooltip label="EV/EBIT" value={formatNumber(data.p_ebit)} />
          <IndicatorWithTooltip label="P/EBITDA" value={formatNumber(data.p_ebitda)} />
          <IndicatorWithTooltip label="P/EBIT" value={formatNumber(data.p_ebit)} />
          <IndicatorWithTooltip label="VPA" value={formatCurrency(data.vpa)} />
          <IndicatorWithTooltip label="P/ATIVO" value={formatNumber(data.p_ativo)} />
          <IndicatorWithTooltip label="P/CAP. GIRO" value={formatNumber(data.p_cap_giro)} />
          <IndicatorWithTooltip label="P/ATIVO CIRC. LIQ." value={formatNumber(data.p_ativo_circ_liq)} />
        </CardContent>
      </Card>

      {/* Indicadores de Endividamento */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-blue-600 tracking-wide">INDICADORES DE ENDIVIDAMENTO</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <IndicatorWithTooltip label="DÍV. LÍQUIDA/PL" value={formatNumber(data.div_liquida_pl)} />
          <IndicatorWithTooltip label="DÍV. LÍQUIDA/EBITDA" value={formatNumber(data.div_liquida_ebitda)} />
          <IndicatorWithTooltip label="DÍV. LÍQUIDA/EBIT" value={formatNumber(data.div_liquida_ebit)} />
          <IndicatorWithTooltip label="PL/ATIVOS" value={formatNumber(data.pl_ativo)} />
          <IndicatorWithTooltip label="PASSIVOS/ATIVOS" value={formatNumber(data.passivo_ativo)} />
          <IndicatorWithTooltip label="LIQ. CORRENTE" value={formatNumber(data.liq_corrente)} />
        </CardContent>
      </Card>

      {/* Indicadores de Eficiência */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-green-600 tracking-wide">INDICADORES DE EFICIÊNCIA</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IndicatorWithTooltip label="M. BRUTA" value={formatPercent(data.m_bruta)} />
          <IndicatorWithTooltip label="M. EBITDA" value={formatPercent(data.m_ebitda)} />
          <IndicatorWithTooltip label="M. EBIT" value={formatPercent(data.m_ebit)} />
          <IndicatorWithTooltip label="M. LÍQUIDA" value={formatPercent(data.m_liquida)} />
        </CardContent>
      </Card>

      {/* Indicadores de Rentabilidade */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-purple-600 tracking-wide">INDICADORES DE RENTABILIDADE</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IndicatorWithTooltip label="ROE" value={formatPercent(data.roe_percent)} />
          <IndicatorWithTooltip label="ROA" value={formatPercent(data.roa_percent)} />
          <IndicatorWithTooltip label="ROIC" value={formatPercent(data.roic)} />
          <IndicatorWithTooltip label="GIRO ATIVOS" value={formatNumber(data.giro_ativos)} />
        </CardContent>
      </Card>

      {/* Indicadores de Crescimento */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-red-600 tracking-wide">INDICADORES DE CRESCIMENTO</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <IndicatorWithTooltip label="CAGR RECEITAS 5 ANOS" value={formatPercent(data.cagr_receitas_5)} />
          <IndicatorWithTooltip label="CAGR LUCROS 5 ANOS" value={formatPercent(data.cagr_lucros_5)} />
        </CardContent>
      </Card>

      {/* Dialog for historical data */}
      {selectedIndicator && (
        <IndicatorHistoryDialog
          isOpen={!!selectedIndicator}
          onClose={() => setSelectedIndicator(null)}
          ticker={ticker}
          indicatorKey={selectedIndicator.key}
          indicatorLabel={selectedIndicator.label}
          isPercentage={selectedIndicator.isPercentage}
        />
      )}
    </div>
  );
};
