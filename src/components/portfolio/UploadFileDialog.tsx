import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, FileSpreadsheet, AlertTriangle } from "lucide-react";
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { createInitialSnapshots } from "@/lib/portfolio-snapshot-service";

// Validation schema for CSV/Excel imports with security constraints
const assetSchema = z.object({
  ticker: z.string().trim()
    .min(1)
    .max(20)
    .regex(/^[A-Z0-9.\-]+$/i, "Ticker deve conter apenas letras, números, pontos e hífens"),
  asset_name: z.string().trim().min(1).max(200),
  asset_class: z.string().trim().min(1).max(50),
  sub_class: z.string().trim().max(50).optional().nullable(),
  quantity: z.number()
    .nonnegative()
    .max(1000000000, "Quantidade muito alta"),
  average_price: z.number()
    .nonnegative()
    .max(100000000, "Preço muito alto"),
  current_price: z.number()
    .nonnegative()
    .max(100000000, "Preço muito alto"),
  currency: z.string().trim().max(10).default('BRL'),
  broker: z.string().trim().max(100).optional().nullable(),
  sector: z.string().trim().max(100).optional().nullable(),
  application_date: z.string().nullable().optional(),
  maturity_date: z.string().nullable().optional(),
  rate: z.string().trim().max(50).nullable().optional(),
  invested_amount: z.number()
    .nonnegative()
    .max(1000000000, "Valor investido muito alto")
    .nullable()
    .optional(),
});

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_ROWS = 1000;

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const UploadFileDialog = ({ open, onOpenChange, onSuccess }: UploadFileDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<'manual' | 'ai'>('manual');
  const [broker, setBroker] = useState<string>('');
  const [location, setLocation] = useState<string>('Brasil');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Validate file size
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: `O arquivo deve ter no máximo ${MAX_FILE_SIZE / (1024 * 1024)}MB.`,
          variant: "destructive",
        });
        e.target.value = ''; // Clear the input
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const sanitizeString = (str: string): string => {
    if (!str) return '';
    // Remove control characters and limit length
    return str.replace(/[\x00-\x1F\x7F]/g, '').trim();
  };

  const sanitizeCellValue = (value: any): string => {
    const str = String(value).trim();
    // Protect against formula injection in Excel/CSV
    if (str.match(/^[=@+\-]/)) {
      return "'" + str; // Prepend single quote to treat as text
    }
    return str;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n');
    
    // Check row limit
    if (lines.length > MAX_ROWS + 1) { // +1 for header
      throw new Error(`O arquivo contém ${lines.length - 1} linhas. O limite é ${MAX_ROWS} registros.`);
    }
    
    const headers = lines[0].split(',').map(h => sanitizeCellValue(sanitizeString(h)));
    
    return lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => sanitizeCellValue(sanitizeString(v)));
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });
  };

  const parseExcel = (buffer: ArrayBuffer): any[] => {
    const workbook = XLSX.read(buffer, { 
      type: 'array',
      cellFormula: false // Disable formula parsing for security
    });
    const allRows: any[] = [];
    let totalRows = 0;
    
    // Parse all sheets
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      totalRows += jsonData.length;
      if (totalRows > MAX_ROWS) {
        throw new Error(`O arquivo contém mais de ${MAX_ROWS} linhas. Reduza o número de registros.`);
      }
      
      // Try to detect and parse different table structures
      let currentTable: string | null = null;
      let headers: string[] = [];
      
      for (let i = 0; i < jsonData.length; i++) {
        const row: any = jsonData[i];
        
        // Detect table headers for Fundos
        if (row[0] === 'Data Referência' || (row[0] && String(row[0]).includes('Absolute Alpha'))) {
          currentTable = 'fundos';
          if (row[0] === 'Data Referência') {
            headers = row.map((h: any) => sanitizeString(String(h)));
          }
          continue;
        }
        
        // Detect table headers for Ações
        if (row[0] === 'Código' && row[1] === 'Ação') {
          currentTable = 'acoes';
          headers = row.map((h: any) => sanitizeString(String(h)));
          continue;
        }
        
        // Detect table headers for Renda Fixa
        if (row[0] === 'Emissor' && row[1] === 'Ativo') {
          currentTable = 'renda_fixa';
          headers = row.map((h: any) => sanitizeString(String(h)));
          continue;
        }
        
        // Parse data rows based on current table
        if (currentTable === 'fundos' && row[0] && !String(row[0]).includes('Total')) {
          const fundName = sanitizeCellValue(String(row[0]).split(' - ')[0].trim());
          if (fundName && row[1] && !isNaN(parseFloat(row[1]))) {
            allRows.push({
              ticker: fundName.substring(0, 20),
              asset_name: fundName,
              asset_class: 'Multimercado',
              quantity: parseFloat(row[2]) || 0,
              average_price: 0,
              current_price: parseFloat(row[3]) || 0,
              currency: 'BRL',
              broker: 'BTG Pactual'
            });
          }
        } else if (currentTable === 'acoes' && row[0] && row[0] !== 'Total em Ações R$' && row[0] !== 'Total em Fundo Imobiliário R$') {
          const ticker = sanitizeCellValue(row[0]).replace(/\s+/g, ''); // Remove espaços do ticker
          allRows.push({
            ticker: ticker,
            asset_name: sanitizeCellValue(row[1] || row[0]),
            asset_class: row[1] && String(row[1]).includes('FII') ? 'FIIs' : 'Ações',
            quantity: parseFloat(row[2]) || 0,
            average_price: parseFloat(row[4]) || 0,
            current_price: parseFloat(row[3]) || 0,
            currency: 'BRL',
            broker: 'BTG Pactual'
          });
        } else if (currentTable === 'renda_fixa' && row[0] && !String(row[0]).includes('Total')) {
          const ticker = row[1] ? sanitizeCellValue(sanitizeString(String(row[1]).split('-')[1] || '')) : sanitizeCellValue(sanitizeString(String(row[0])));
          const quantity = parseFloat(row[4]) || 0;
          const unitPrice = parseFloat(row[5]) || 0;
          const investedAmount = parseFloat(row[8]) || (quantity * unitPrice);
          
          allRows.push({
            ticker: ticker.substring(0, 20),
            asset_name: sanitizeCellValue(sanitizeString(`${row[0]} - ${ticker}`).substring(0, 200)),
            asset_class: 'Renda Fixa',
            sub_class: row[3] || null,
            quantity: quantity,
            average_price: unitPrice,
            current_price: parseFloat(row[6]) || unitPrice,
            currency: 'BRL',
            broker: sanitizeCellValue(sanitizeString('BTG Pactual')),
            rate: row[2] || null,
            invested_amount: investedAmount
          });
        }
      }
    });
    
    return allRows.length > 0 ? allRows : XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      // Check if it's a PDF and use AI processing
      if (fileExtension === 'pdf') {
        await handlePDFWithAI(user.id);
        return;
      }

      // Otherwise, use the manual parsing for CSV/Excel
      let rows: any[] = [];

      if (fileExtension === 'csv') {
        const text = await file.text();
        rows = parseCSV(text);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const buffer = await file.arrayBuffer();
        rows = parseExcel(buffer);
      } else {
        throw new Error("Formato de arquivo não suportado. Use CSV, Excel ou PDF.");
      }

      const validatedAssets: any[] = [];
      const validationErrors: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        
        try {
          const rawAsset = {
            ticker: sanitizeCellValue(sanitizeString(row.ticker || row.Ticker || '')),
            asset_name: sanitizeCellValue(sanitizeString(row.asset_name || row.name || row.Nome || '')),
            asset_class: sanitizeCellValue(sanitizeString(row.asset_class || row.class || 'Ações')),
            sub_class: row.sub_class || row.subclass || null,
            quantity: parseFloat(row.quantity || row.quantidade || '0'),
            average_price: parseFloat(row.average_price || row.preco_medio || '0'),
            current_price: parseFloat(row.current_price || row.preco_atual || row.average_price || row.preco_medio || '0'),
            currency: sanitizeCellValue(sanitizeString(row.currency || row.moeda || 'BRL')),
            broker: sanitizeCellValue(sanitizeString(row.broker || row.corretora || '')),
            sector: sanitizeCellValue(sanitizeString(row.sector || row.setor || '')),
            application_date: row.application_date || row.data_aplicacao || null,
            maturity_date: row.maturity_date || row.data_vencimento || null,
            rate: sanitizeCellValue(sanitizeString(row.rate || row.taxa || '')),
            invested_amount: row.invested_amount || row.valor_aplicado ? parseFloat(row.invested_amount || row.valor_aplicado) : null,
          };

          // Validate with Zod schema
          const validatedAsset = assetSchema.parse(rawAsset);
          
          validatedAssets.push({
            ...validatedAsset,
            user_id: user.id,
            broker: broker || validatedAsset.broker,
            currency: location === 'Exterior' ? 'USD' : (validatedAsset.currency || 'BRL'),
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            validationErrors.push(`Linha ${i + 2}: ${error.errors.map(e => e.message).join(', ')}`);
          } else {
            validationErrors.push(`Linha ${i + 2}: Erro ao validar dados`);
          }
        }
      }

      if (validationErrors.length > 0 && validatedAssets.length === 0) {
        throw new Error(`Nenhum ativo válido encontrado:\n${validationErrors.slice(0, 5).join('\n')}`);
      }

      const assets = validatedAssets;

      if (assets.length === 0) {
        throw new Error("Nenhum ativo válido encontrado. Verifique se o arquivo possui as colunas 'ticker' e 'asset_name'.");
      }

      const { error } = await supabase.from("assets").insert(assets);

      if (error) throw error;

      // Criar snapshots iniciais automaticamente
      console.log('[UploadFileDialog] Creating initial snapshots after import...');
      const snapshotResult = await createInitialSnapshots(user.id);
      console.log('[UploadFileDialog] Snapshot result:', snapshotResult);

      // Sincronizar dividendos históricos automaticamente
      console.log('[UploadFileDialog] Syncing historical dividends...');
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-historical-dividends');
        if (syncError) {
          console.error('[UploadFileDialog] Error syncing dividends:', syncError);
        } else {
          console.log('[UploadFileDialog] Dividends sync result:', syncData);
          if (syncData?.synced > 0) {
            toast({
              title: "Proventos sincronizados!",
              description: `${syncData.synced} provento(s) foram adicionados automaticamente.`,
            });
          }
        }
      } catch (syncErr) {
        console.error('[UploadFileDialog] Error calling sync-historical-dividends:', syncErr);
      }

      const ignoredCount = rows.length - assets.length;
      const warningMessage = validationErrors.length > 0 
        ? `\n\nAvisos: ${validationErrors.length} linha(s) com problemas foram ignoradas.`
        : '';
      
      toast({
        title: "Importação concluída!",
        description: ignoredCount > 0 
          ? `${assets.length} ativo(s) importado(s) com sucesso. ${ignoredCount} linha(s) ignorada(s).${warningMessage}`
          : `${assets.length} ativo(s) importado(s) com sucesso. Rentabilidade já calculada!`,
      });

      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDFWithAI = async (userId: string) => {
    try {
      toast({
        title: "Processando PDF...",
        description: "Extraindo dados do relatório com IA. Isso pode levar alguns segundos.",
      });

      // Import pdf.js library
      const pdfjsLib = await import('pdfjs-dist');
      // Use the worker from the installed package
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      // Read PDF file
      const arrayBuffer = await file!.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Extract text from all pages
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 20); // Limit to first 20 pages to avoid token limits
      
      toast({
        title: "Extraindo texto...",
        description: `Lendo ${maxPages} página(s) do PDF...`,
      });

      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n\n=== Página ${pageNum} ===\n${pageText}`;
      }

      console.log(`Extracted ${fullText.length} characters from PDF`);

      // If text is too long, truncate intelligently (keep beginning and end)
      const maxChars = 50000; // Limit to avoid token issues
      if (fullText.length > maxChars) {
        const halfChars = maxChars / 2;
        fullText = fullText.substring(0, halfChars) + 
                   '\n\n[... conteúdo truncado ...]\n\n' + 
                   fullText.substring(fullText.length - halfChars);
      }

      toast({
        title: "Analisando com IA...",
        description: "Identificando ativos no relatório...",
      });

      const { data, error } = await supabase.functions.invoke('parse-portfolio-pdf', {
        body: { pdfContent: fullText }
      });

      if (error) throw error;

      if (!data.success || !data.assets || data.assets.length === 0) {
        throw new Error("Nenhum ativo foi encontrado no PDF. Certifique-se de que é um relatório de corretora válido com dados de posições.");
      }

      // Add user_id to all assets and clean tickers for renda variável
      const assets = data.assets.map((asset: any) => {
        // Clean ticker for renda variável (remove spaces)
        let cleanedTicker = asset.ticker;
        if (asset.asset_class === "Renda Variável" || 
            asset.sub_class === "Fundos Imobiliário" || 
            asset.sub_class === "Ações") {
          cleanedTicker = asset.ticker.replace(/\s+/g, '');
        }
        
        return {
          ...asset,
          ticker: cleanedTicker,
          user_id: userId,
          broker: broker || asset.broker || '',
          sector: asset.sector || '',
          sub_class: asset.sub_class || null,
          application_date: asset.application_date || null,
          maturity_date: asset.maturity_date || null,
          rate: asset.rate || null,
          invested_amount: asset.invested_amount || null,
          currency: location === 'Exterior' ? 'USD' : (asset.currency || 'BRL'),
        };
      });

      // Insert assets
      const { error: insertError } = await supabase.from("assets").insert(assets);
      if (insertError) throw insertError;

      // Criar snapshots iniciais automaticamente
      console.log('[UploadFileDialog] Creating initial snapshots after PDF import...');
      const snapshotResult = await createInitialSnapshots(userId);
      console.log('[UploadFileDialog] Snapshot result:', snapshotResult);

      // Sincronizar dividendos históricos automaticamente
      console.log('[UploadFileDialog] Syncing historical dividends after PDF import...');
      let dividendsSyncMessage = '';
      try {
        const { data: syncData, error: syncError } = await supabase.functions.invoke('sync-historical-dividends');
        if (syncError) {
          console.error('[UploadFileDialog] Error syncing dividends:', syncError);
        } else {
          console.log('[UploadFileDialog] Dividends sync result:', syncData);
          if (syncData?.synced > 0) {
            dividendsSyncMessage = ` ${syncData.synced} provento(s) sincronizados.`;
          }
        }
      } catch (syncErr) {
        console.error('[UploadFileDialog] Error calling sync-historical-dividends:', syncErr);
      }

      toast({
        title: "Importação concluída!",
        description: `${assets.length} ativo(s) extraído(s) e importado(s) com sucesso.${dividendsSyncMessage}`,
      });

      onSuccess();
      onOpenChange(false);
      setFile(null);
    } catch (error: any) {
      console.error('Error processing PDF with AI:', error);
      toast({
        title: "Erro ao processar PDF",
        description: error.message || "Não foi possível extrair os dados do PDF. Tente usar um formato Excel/CSV.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar Ativos</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setUploadType('manual')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  uploadType === 'manual'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">Excel/CSV</h3>
                <p className="text-xs text-muted-foreground">
                  Importação estruturada de planilhas
                </p>
              </button>
              
              <button
                type="button"
                onClick={() => setUploadType('ai')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  uploadType === 'ai'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <FileText className="h-8 w-8 mx-auto mb-2" />
                <h3 className="font-semibold mb-1">PDF com IA</h3>
                <p className="text-xs text-muted-foreground">
                  Extração automática de relatórios
                </p>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="broker">Banco/Corretora</Label>
                <Select value={broker} onValueChange={setBroker}>
                  <SelectTrigger id="broker">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BTG Pactual">BTG Pactual</SelectItem>
                    <SelectItem value="XP Investimentos">XP Investimentos</SelectItem>
                    <SelectItem value="Itaú">Itaú</SelectItem>
                    <SelectItem value="Bradesco">Bradesco</SelectItem>
                    <SelectItem value="Santander">Santander</SelectItem>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="Nubank">Nubank</SelectItem>
                    <SelectItem value="Rico">Rico</SelectItem>
                    <SelectItem value="Clear">Clear</SelectItem>
                    <SelectItem value="Modal">Modal</SelectItem>
                    <SelectItem value="Avenue">Avenue</SelectItem>
                    <SelectItem value="Nomad">Nomad</SelectItem>
                    <SelectItem value="Interactive Brokers">Interactive Brokers</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brasil">Brasil</SelectItem>
                    <SelectItem value="Exterior">Exterior</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">
                {uploadType === 'ai' ? 'Relatório PDF da Corretora' : 'Arquivo (CSV ou Excel)'}
              </Label>
              <div className="flex items-center gap-2">
                <input
                  id="file-upload"
                  type="file"
                  accept={uploadType === 'ai' ? '.pdf' : '.csv,.xlsx,.xls'}
                  onChange={handleFileChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                />
              </div>
              {uploadType === 'ai' ? (
                <div className="rounded-md bg-blue-50 dark:bg-blue-950 p-3 space-y-2">
                  <p className="text-xs text-blue-900 dark:text-blue-100 font-medium">
                    ✨ Processamento Inteligente com IA
                  </p>
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    A IA irá analisar seu relatório e extrair automaticamente:
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 ml-4">
                    <li>• Ações, FIIs e ETFs</li>
                    <li>• Fundos de Investimento</li>
                    <li>• Renda Fixa (CDB, CRA, CRI, Debêntures)</li>
                    <li>• Ativos internacionais</li>
                  </ul>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Funciona com relatórios de: BTG Pactual, XP, Rico, Clear e outras corretoras
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: CSV ou Excel (.xlsx, .xls). O arquivo deve conter: ticker, asset_name, asset_class, quantity, average_price
                  </p>
                  <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 dark:text-amber-200">
                      <p className="font-medium mb-1">Limites de segurança:</p>
                      <ul className="space-y-0.5 ml-2">
                        <li>• Tamanho máximo: 5MB</li>
                        <li>• Máximo de {MAX_ROWS.toLocaleString()} registros</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !file}>
              <Upload className="mr-2 h-4 w-4" />
              {loading ? "Processando..." : uploadType === 'ai' ? "Processar com IA" : "Importar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
