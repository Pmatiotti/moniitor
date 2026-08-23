import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import * as XLSX from "xlsx";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const assetSchema = z.object({
  ticker: z.string()
    .min(1, "Ticker é obrigatório")
    .max(20)
    .regex(/^[A-Z0-9.\-]+$/i, "Ticker deve conter apenas letras, números, pontos e hífens"),
  asset_name: z.string().min(1, "Nome do ativo é obrigatório").max(200),
  asset_class: z.string().min(1, "Classe é obrigatória"),
  quantity: z.number()
    .positive("Quantidade deve ser positiva")
    .max(1000000000, "Quantidade muito alta"),
  average_price: z.number()
    .nonnegative("Preço médio deve ser não negativo")
    .max(100000000, "Preço muito alto"),
  current_price: z.number()
    .nonnegative()
    .max(100000000, "Preço muito alto")
    .optional(),
  broker: z.string().optional(),
  sub_class: z.string().optional(),
  account_name: z.string().optional(),
});

type ImportMode = 'add' | 'replace';

interface ImportClientPortfolioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onSuccess: () => void;
}

export const ImportClientPortfolioDialog = ({ 
  open, 
  onOpenChange, 
  clientId,
  clientName,
  onSuccess 
}: ImportClientPortfolioDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [broker, setBroker] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [location, setLocation] = useState<string>('Brasil');
  const [importMode, setImportMode] = useState<ImportMode>('add');
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 20MB.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
    }
  };

  const sanitizeCellValue = (value: any): string => {
    const str = String(value).trim();
    // Protect against formula injection
    if (str.match(/^[=@+\-]/)) {
      return "'" + str;
    }
    return str;
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').slice(0, 1000);
    const headers = lines[0].split(',').map(h => sanitizeCellValue(h).toLowerCase());
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = sanitizeCellValue(values[index] || '');
      });
      return row;
    });
  };

  const parseExcel = async (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { 
            type: 'array',
            cellFormula: false // Disable formula parsing for security
          });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
          
          // Sanitize all cell values
          const sanitizedData = jsonData.slice(0, 1000).map((row: any) => {
            const sanitized: any = {};
            for (const [key, value] of Object.entries(row)) {
              sanitized[key] = sanitizeCellValue(value);
            }
            return sanitized;
          });
          
          resolve(sanitizedData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({
        title: "Selecione um arquivo",
        description: "Por favor, selecione um arquivo para importar.",
        variant: "destructive",
      });
      return;
    }

    if (!broker) {
      toast({
        title: "Selecione uma corretora",
        description: "A corretora é obrigatória para importação.",
        variant: "destructive",
      });
      return;
    }

    // Se modo é replace e não está vindo da confirmação, mostrar dialog
    if (importMode === 'replace' && !pendingSubmit) {
      setShowReplaceConfirm(true);
      return;
    }

    setPendingSubmit(false);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Verificar se é cliente manual ou vinculado
      const { data: manualClient } = await supabase
        .from("clients")
        .select("id")
        .eq("id", clientId)
        .maybeSingle();

      const isLinkedClient = !manualClient;

      // Se modo replace, deletar ativos existentes da mesma corretora + conta
      if (importMode === 'replace') {
        await deleteExistingAssets(clientId, isLinkedClient, broker, accountName || null);
      }

      let rawData: any[] = [];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'csv') {
        const text = await file.text();
        rawData = parseCSV(text);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        rawData = await parseExcel(file) as any[];
      } else if (fileExtension === 'pdf') {
        toast({
          title: "Processando PDF com IA",
          description: "Extraindo dados do relatório...",
        });
        await handlePDFWithAI(file, user.id, isLinkedClient);
        return;
      } else {
        throw new Error("Formato de arquivo não suportado. Use CSV, XLSX ou PDF.");
      }

      const validAssets: any[] = [];
      const errors: string[] = [];

      for (const row of rawData) {
        try {
          let ticker = row.ticker || row.código || row.code;
          const assetClass = row.asset_class || row.classe || row.class || "Ações";
          const subClass = row.sub_class || row.subclasse;
          
          // Clean ticker for renda variável (remove spaces)
          if (assetClass === "Renda Variável" || 
              subClass === "Fundos Imobiliário" || 
              subClass === "Ações") {
            ticker = ticker?.replace(/\s+/g, '');
          }
          
          const asset = {
            ticker: ticker,
            asset_name: row.asset_name || row.nome || row.name || row.ativo,
            asset_class: assetClass,
            quantity: parseFloat(row.quantity || row.quantidade || row.qtd || "0"),
            average_price: parseFloat(row.average_price || row.preço_médio || row.pm || "0"),
            current_price: parseFloat(row.current_price || row.preço_atual || row.preço || "0"),
            broker: row.broker || row.corretora || row.instituição,
            sub_class: subClass,
            account_name: row.account_name || row.conta,
          };

          const validated = assetSchema.parse(asset);
          
          // Para clientes vinculados: user_id = clientId (profile.id), client_id = null
          // Para clientes manuais: user_id = advisor.id, client_id = clientId
          validAssets.push({
            ...validated,
            user_id: isLinkedClient ? clientId : user.id,
            client_id: isLinkedClient ? null : clientId,
            current_price: validated.current_price || validated.average_price,
            broker: broker || validated.broker,
            account_name: accountName || validated.account_name || null,
            currency: location === 'Exterior' ? 'USD' : 'BRL',
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push(`Linha inválida: ${error.errors.map(e => e.message).join(", ")}`);
          }
        }
      }

      if (validAssets.length === 0) {
        throw new Error("Nenhum ativo válido encontrado no arquivo.");
      }

      const { error: insertError } = await supabase
        .from("assets")
        .insert(validAssets);

      if (insertError) throw insertError;

      // Criar snapshot
      await createSnapshot(clientId, user.id, validAssets, isLinkedClient);

      // Atualizar data do último update (apenas para clientes manuais)
      if (!isLinkedClient) {
        await supabase
          .from("clients")
          .update({ last_portfolio_update: new Date().toISOString() })
          .eq("id", clientId);
      }

      const modeText = importMode === 'replace' ? 'substituído(s)' : 'importado(s)';
      toast({
        title: "Importação concluída",
        description: `${validAssets.length} ativo(s) ${modeText} com sucesso para ${clientName}.`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
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

  const deleteExistingAssets = async (
    targetClientId: string, 
    isLinkedClient: boolean, 
    brokerName: string,
    accountNameFilter: string | null
  ): Promise<void> => {
    // Build filters based on client type and account
    const baseFilters: Record<string, string | null> = {
      broker: brokerName,
    };

    if (isLinkedClient) {
      baseFilters.user_id = targetClientId;
      baseFilters.client_id = null;
    } else {
      baseFilters.client_id = targetClientId;
    }

    if (accountNameFilter) {
      baseFilters.account_name = accountNameFilter;
    } else {
      baseFilters.account_name = null;
    }

    // Use RPC or direct SQL approach to avoid TypeScript chain issues
    const { error: deleteError } = await supabase
      .from("assets")
      .delete()
      .match(baseFilters);

    if (deleteError) {
      console.error("[ImportPortfolio] Error deleting existing assets:", deleteError);
      throw new Error("Erro ao limpar ativos existentes: " + deleteError.message);
    }

    console.log(`[ImportPortfolio] Cleared existing assets for broker: ${brokerName}, account: ${accountNameFilter || 'default'}`);
  };

  const resetForm = () => {
    setFile(null);
    setBroker('');
    setAccountName('');
    setLocation('Brasil');
    setImportMode('add');
  };

  const handleConfirmReplace = () => {
    setShowReplaceConfirm(false);
    setPendingSubmit(true);
    // Trigger submit again with pendingSubmit = true
    setTimeout(() => handleSubmit(), 0);
  };

  const handlePDFWithAI = async (file: File, userId: string, isLinkedClient: boolean) => {
    try {
      // Se modo replace, deletar ativos existentes da mesma corretora + conta
      if (importMode === 'replace' && broker) {
        await deleteExistingAssets(clientId, isLinkedClient, broker, accountName || null);
      }

      // Dynamic import of pdf.js for compatibility with version 5.x
      const pdfjsLib = await import('pdfjs-dist');
      
      // Use local worker from installed package (compatible with v5.x)
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      const maxPages = Math.min(pdf.numPages, 10);
      
      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + "\n";
      }

      const { data, error } = await supabase.functions.invoke('parse-portfolio-pdf', {
        body: { 
          pdfContent: fullText,
          selectedBroker: broker || null  // Passa a corretora selecionada como contexto para IA
        }
      });

      if (error) throw error;

      if (data.assets && data.assets.length > 0) {
        const assetsToInsert = data.assets.map((asset: any) => {
          // Clean ticker for renda variável (remove spaces)
          let cleanedTicker = asset.ticker;
          if (asset.asset_class === "Renda Variável" || 
              asset.sub_class === "Fundos Imobiliário" || 
              asset.sub_class === "Ações") {
            cleanedTicker = asset.ticker.replace(/\s+/g, '');
          }
          
          // Para clientes vinculados: user_id = clientId (profile.id), client_id = null
          // Para clientes manuais: user_id = advisor.id, client_id = clientId
          return {
            ...asset,
            ticker: cleanedTicker,
            user_id: isLinkedClient ? clientId : userId,
            client_id: isLinkedClient ? null : clientId,
            current_price: asset.current_price || asset.average_price,
            // Priorizar corretora selecionada pelo usuário, usar IA apenas como fallback
            broker: broker || asset.broker || null,
            account_name: accountName || null,
            currency: location === 'Exterior' ? 'USD' : 'BRL',
          };
        });

        const { error: insertError } = await supabase
          .from("assets")
          .insert(assetsToInsert);

        if (insertError) throw insertError;

        // Criar snapshot
        await createSnapshot(clientId, userId, assetsToInsert, isLinkedClient);

        // Atualizar data do último update (apenas para clientes manuais)
        if (!isLinkedClient) {
          await supabase
            .from("clients")
            .update({ last_portfolio_update: new Date().toISOString() })
            .eq("id", clientId);
        }

        const modeText = importMode === 'replace' ? 'substituído(s)' : 'extraído(s)';
        toast({
          title: "Importação via IA concluída",
          description: `${data.assets.length} ativo(s) ${modeText} do PDF para ${clientName}.`,
        });

        onSuccess();
        onOpenChange(false);
        resetForm();
      } else {
        throw new Error("Não foi possível extrair ativos do PDF.");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao processar PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async (clientId: string, advisorId: string, assets: any[], isLinkedClient: boolean = false) => {
    const totalValue = assets.reduce((sum, asset) => {
      // Para RF, COE, Fundos e Multimercado: current_price já é o valor total quando quantity = 1
      const isFixedValueAsset = 
        (asset.asset_class === "Renda Fixa" || 
         asset.asset_class === "COE" || 
         asset.asset_class === "Fundos de Investimento" ||
         asset.asset_class === "Multimercado") && 
        Number(asset.quantity) === 1;
      
      const value = isFixedValueAsset 
        ? Number(asset.current_price) 
        : Number(asset.current_price) * Number(asset.quantity);
      return sum + value;
    }, 0);

    // Para clientes vinculados, não criar snapshot na tabela client_portfolio_snapshots
    // pois a FK exige que client_id exista na tabela clients
    if (isLinkedClient) {
      console.log("Snapshot skipped for linked client - assets saved directly to user portfolio");
      return;
    }

    await supabase.from("client_portfolio_snapshots").insert({
      client_id: clientId,
      advisor_id: advisorId,
      snapshot_date: new Date().toISOString().split('T')[0],
      total_value: totalValue,
      assets_snapshot: assets,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Posição de {clientName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="broker-client">Banco/Corretora *</Label>
                <Select value={broker} onValueChange={setBroker}>
                  <SelectTrigger id="broker-client">
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
                <Label htmlFor="location-client">Localização</Label>
                <Select value={location} onValueChange={setLocation}>
                  <SelectTrigger id="location-client">
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
              <Label htmlFor="account-name">Nome da Conta (opcional)</Label>
              <Input
                id="account-name"
                placeholder="Ex: BTG Principal, BTG Offshore, Conta PJ..."
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use para diferenciar múltiplas contas na mesma corretora
              </p>
            </div>

            <div className="space-y-3">
              <Label>Modo de Importação</Label>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="add" id="mode-add" className="mt-1" />
                  <div>
                    <Label htmlFor="mode-add" className="cursor-pointer font-normal">
                      Adicionar aos ativos existentes
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Mantém os ativos atuais e adiciona os novos
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="replace" id="mode-replace" className="mt-1" />
                  <div>
                    <Label htmlFor="mode-replace" className="cursor-pointer font-normal">
                      Substituir posição atual
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Remove ativos desta corretora{accountName ? ` e conta "${accountName}"` : ''} antes de importar
                    </p>
                  </div>
                </div>
              </RadioGroup>
              {importMode === 'replace' && (
                <div className="flex items-center gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-md">
                  <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Ativos de {broker || 'corretora selecionada'}{accountName ? ` (${accountName})` : ''} serão removidos
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Arquivo de Posição</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  onChange={handleFileChange}
                  className="flex-1"
                />
              </div>
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Formatos aceitos: CSV, XLSX, PDF (máx 20MB)
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!file || !broker || loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {importMode === 'replace' ? 'Substituindo...' : 'Importando...'}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {importMode === 'replace' ? 'Substituir' : 'Importar'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Substituição</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a substituir a posição do cliente em{" "}
              <strong>{broker}</strong>
              {accountName && <> (conta: <strong>{accountName}</strong>)</>}.
              <br /><br />
              Todos os ativos existentes desta corretora{accountName ? " e conta" : ""} serão removidos
              e substituídos pelos novos ativos do arquivo.
              <br /><br />
              <span className="text-amber-600 dark:text-amber-400">
                Esta ação não pode ser desfeita.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace} className="bg-amber-600 hover:bg-amber-700">
              Confirmar Substituição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};