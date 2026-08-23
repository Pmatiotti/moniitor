import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface ImportIRPFDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientId?: string;
}

export const ImportIRPFDialog = ({
  open,
  onOpenChange,
  onSuccess,
  clientId,
}: ImportIRPFDialogProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Accept XML or JSON files
      if (!file.name.endsWith('.xml') && !file.name.endsWith('.json')) {
        setError('Por favor, selecione um arquivo XML ou JSON da declaração de IR.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    try {
      // Read file content
      const fileContent = await selectedFile.text();
      
      // Call edge function to parse and import
      const { data, error: fnError } = await supabase.functions.invoke('parse-irpf-xml', {
        body: {
          xmlContent: fileContent,
          clientId: clientId || null,
        },
      });

      if (fnError) throw fnError;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar arquivo');
      }

      setResult(data);
      toast({
        title: "Importação concluída!",
        description: data.message,
      });

    } catch (err: any) {
      console.error('Import error:', err);
      setError(err.message || 'Erro ao importar arquivo');
      toast({
        title: "Erro na importação",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (result) {
      onSuccess();
    }
    setSelectedFile(null);
    setResult(null);
    setError(null);
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Declaração de IR
          </DialogTitle>
          <DialogDescription>
            Importe o arquivo XML ou JSON da sua declaração de Imposto de Renda para 
            popular automaticamente seus bens e direitos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              {/* File Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${selectedFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml,.json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile ? (
                  <div className="space-y-2">
                    <FileText className="h-10 w-10 mx-auto text-primary" />
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <Button variant="ghost" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}>
                      Trocar arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="font-medium">Clique para selecionar o arquivo</p>
                    <p className="text-sm text-muted-foreground">
                      Aceita arquivos XML ou JSON
                    </p>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  <strong>Como obter o arquivo:</strong> No programa da Receita Federal, 
                  vá em "Gravar Declaração para Entrega" e selecione a opção de exportar 
                  para arquivo. O sistema suporta os formatos XML e JSON.
                </AlertDescription>
              </Alert>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleImport} 
                  disabled={!selectedFile || loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Importar
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            /* Success Result */
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <h3 className="text-lg font-semibold">Importação Concluída!</h3>
                <p className="text-muted-foreground">
                  {result.totalAssets} bens importados do IRPF {result.year}
                </p>
              </div>

              {/* Summary by category */}
              {result.totals && Object.keys(result.totals).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Resumo por categoria:</h4>
                  <div className="space-y-1">
                    {Object.entries(result.totals).map(([category, value]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span className="text-muted-foreground capitalize">
                          {category.replace(/_/g, ' ')}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(value as number)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={handleClose}>
                Concluir
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};