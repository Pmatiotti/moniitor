import { useParams, Navigate } from "react-router-dom";
import { isFIITicker } from "@/lib/ticker-detection";

// Lazy load the appropriate component based on asset type
import PublicStock from "./PublicStock";
import PublicFII from "./PublicFII";

/**
 * TickerAnalysis - Detecta automaticamente o tipo de ativo e renderiza a interface apropriada
 * 
 * Lógica de detecção:
 * - Tickers terminados em "11" são FIIs (exceto ETFs conhecidos como BOVA11, IVVB11)
 * - ETFs de Renda Fixa (LFTB11, IMAB11) são tratados como ações
 * - Demais tickers são tratados como ações
 */
export default function TickerAnalysis() {
  const { ticker } = useParams<{ ticker: string }>();
  
  if (!ticker) {
    return <Navigate to="/ticker" replace />;
  }

  const tickerUpper = ticker.toUpperCase();
  
  // Detectar se é FII e renderizar componente apropriado
  if (isFIITicker(tickerUpper)) {
    // Renderiza a interface de FII
    return <PublicFII />;
  }
  
  // Renderiza a interface de Ação
  return <PublicStock />;
}
