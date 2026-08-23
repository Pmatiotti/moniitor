import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { isFIITicker } from "@/lib/ticker-detection";

interface UploadDividendsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface DividendRow {
  ticker: string;
  tipo: string;
  valor: number;
  data_pagamento: string;
  data_ex?: string;
}

export const UploadDividendsDialog = ({ open, onOpenChange, onSuccess }: UploadDividendsDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [useAI, setUseAI] = useState(false);

  // Function to determine asset class based on ticker and dividend type
  const determineAssetClass = (ticker: string, dividendType: string): string => {
    const upperTicker = ticker.toUpperCase();
    
    if (isFIITicker(ticker)) return 'FII';
    if (dividendType === 'cupom' || dividendType === 'amortização') {
      if (upperTicker.includes('DEB')) return 'Debenture';
      if (upperTicker.includes('CRI')) return 'CRI';
      if (upperTicker.includes('CRA')) return 'CRA';
      if (upperTicker.includes('FIDC')) return 'FIDC';
      return 'Debenture';
    }
    return 'Ações';
  };

  // Function to determine market type based on asset class
  const determineMarketType = (assetClass: string): string => {
    const rendaFixa = ['Debenture', 'CRI', 'CRA', 'FIDC'];
    return rendaFixa.includes(assetClass) ? 'Renda Fixa' : 'Renda Variável';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
        toast({
          title: "Formato inválido",
          description: "Por favor, selecione um arquivo Excel (.xlsx ou .xls)",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const mapDividendType = (tipo: string): string => {
    const tipoLower = tipo.toLowerCase().trim();
    if (tipoLower.includes('jcp')) return 'jcp';
    if (tipoLower.includes('rendimento')) return 'rendimento';
    if (tipoLower.includes('amortiz')) return 'amortização';
    if (tipoLower.includes('cupom') || tipoLower.includes('juros')) return 'cupom';
    return 'dividendo';
  };

  const parseExcelDate = (value: any): string | null => {
    if (!value) return null;
    
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }
    
    if (typeof value === 'string' && value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = value.split('/');
      return `${year}-${month}-${day}`;
    }
    
    if (typeof value === 'string' && value.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
      const [month, day, year] = value.split('/');
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
    
    return null;
  };

  const handleUploadWithAI = async () => {
    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo Excel",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const csvContent = XLSX.utils.sheet_to_csv(worksheet);

      if (!csvContent || csvContent.trim().length === 0) {
        throw new Error("O arquivo está vazio");
      }

      console.log("Processando com IA...");

      const { data: aiResult, error: aiError } = await supabase.functions.invoke('parse-dividends-ai', {
        body: { excelContent: csvContent }
      });

      if (aiError) throw aiError;

      if (!aiResult?.dividends || aiResult.dividends.length === 0) {
        throw new Error("Nenhum provento foi identificado no arquivo");
      }

      const dividendsWithUser = aiResult.dividends.map((d: any) => {
        const assetClass = d.asset_class || determineAssetClass(d.ticker, d.dividend_type);
        const marketType = d.market_type || determineMarketType(assetClass);
        
        return {
          ticker: d.ticker.toUpperCase(),
          dividend_type: d.dividend_type,
          amount: d.amount,
          payment_date: d.payment_date,
          ex_date: d.ex_date || null,
          asset_class: assetClass,
          market_type: marketType,
          user_id: user.id
        };
      });

      const { error } = await supabase.from("dividends").insert(dividendsWithUser);

      if (error) throw error;

      toast({
        title: "Upload concluído!",
        description: `${dividendsWithUser.length} provento(s) importado(s) com sucesso usando IA.`,
      });

      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      console.error("Erro ao processar com IA:", error);
      toast({
        title: "Erro ao processar arquivo",
        description: error.message || "Erro ao processar com IA. Tente o modo manual.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (useAI) {
      return handleUploadWithAI();
    }

    if (!file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo Excel",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("O arquivo está vazio");
      }

      const dividends: any[] = [];
      const errors: string[] = [];

      jsonData.forEach((row, index) => {
        try {
          const ticker = row.ticker || row.Ticker || row.TICKER || row.ativo || row.Ativo || row.ATIVO;
          const tipo = row.tipo || row.Tipo || row.TIPO || row.type || row.Type || row.TYPE;
          
          let valor = row.valor || row.Valor || row.VALOR || row.amount || row.Amount || row.AMOUNT ||
                     row['Valor Líquido'] || row['Valor Liquido'] || row['VALOR LÍQUIDO'] ||
                     row['valor_liquido'] || row['valor líquido'];
          
          if (typeof valor === 'string') {
            valor = parseFloat(valor.replace(/[$R\s]/g, '').replace(',', '.'));
          }
          
          const dataPagamento = row.data_pagamento || row.Data_Pagamento || row.DATA_PAGAMENTO || 
                                row['data pagamento'] || row['Data Pagamento'] || row['DATA PAGAMENTO'] ||
                                row['Data de Pagamento'] || row['DATA DE PAGAMENTO'] ||
                                row.payment_date || row.Payment_Date || row.PAYMENT_DATE;
          const dataEx = row.data_ex || row.Data_Ex || row.DATA_EX || 
                        row['data ex'] || row['Data Ex'] || row['DATA EX'] ||
                        row['Data COM'] || row['Data Com'] || row['data com'] ||
                        row.ex_date || row.Ex_Date || row.EX_DATE;

          if (!ticker || !valor || !dataPagamento) {
            errors.push(`Linha ${index + 2}: Dados obrigatórios faltando (ticker, valor, data_pagamento)`);
            return;
          }

          const parsedPaymentDate = parseExcelDate(dataPagamento);
          if (!parsedPaymentDate) {
            errors.push(`Linha ${index + 2}: Data de pagamento inválida`);
            return;
          }

          const parsedExDate = dataEx ? parseExcelDate(dataEx) : null;

          const dividendType = tipo ? mapDividendType(String(tipo)) : 'dividendo';
          const tickerUpper = String(ticker).toUpperCase().trim();
          const assetClass = determineAssetClass(tickerUpper, dividendType);
          const marketType = determineMarketType(assetClass);

          dividends.push({
            user_id: user.id,
            ticker: tickerUpper,
            dividend_type: dividendType,
            amount: typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[$R\s,]/g, '.').replace('..', '.')),
            payment_date: parsedPaymentDate,
            ex_date: parsedExDate,
            asset_class: assetClass,
            market_type: marketType
          });
        } catch (error: any) {
          errors.push(`Linha ${index + 2}: ${error.message}`);
        }
      });

      if (errors.length > 0) {
        console.error("Erros no processamento:", errors);
      }

      if (dividends.length === 0) {
        throw new Error("Nenhum provento válido encontrado no arquivo");
      }

      const { error } = await supabase.from("dividends").insert(dividends);

      if (error) throw error;

      toast({
        title: "Upload concluído!",
        description: `${dividends.length} provento(s) importado(s) com sucesso.${errors.length > 0 ? ` ${errors.length} linha(s) com erro.` : ''}`,
      });

      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      toast({
        title: "Erro ao processar arquivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Proventos do Excel
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo Excel com o histórico de proventos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="ai-mode" className="text-base font-medium cursor-pointer">
                  Processar com IA
                </Label>
                <p className="text-sm text-muted-foreground">
                  Usa inteligência artificial para identificar automaticamente os dados do arquivo
                </p>
              </div>
            </div>
            <Switch
              id="ai-mode"
              checked={useAI}
              onCheckedChange={setUseAI}
            />
          </div>

          {!useAI && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Formato esperado:</strong> O arquivo deve conter as colunas:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li><strong>ticker</strong> (obrigatório): Código do ativo (ex: PETR4)</li>
                  <li><strong>tipo</strong> (opcional): Tipo do provento (Dividendo, JCP, Rendimento)</li>
                  <li><strong>valor</strong> (obrigatório): Valor do provento</li>
                  <li><strong>data_pagamento</strong> (obrigatório): Data de pagamento</li>
                  <li><strong>data_ex</strong> (opcional): Data ex-dividendo</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {useAI && (
            <Alert className="border-primary/50 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription>
                <strong>Modo IA ativado:</strong> O sistema irá analisar automaticamente o conteúdo do arquivo 
                e identificar as colunas relevantes, independente do formato. Funciona com diversos layouts de planilhas.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="file">Arquivo Excel</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} disabled={!file || loading}>
              {useAI ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {loading ? "Processando com IA..." : "Importar com IA"}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {loading ? "Importando..." : "Importar"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
