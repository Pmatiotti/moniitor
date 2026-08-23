import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { usePluggySync } from "@/hooks/usePluggySync";
import { PluggyConnect as PluggyConnectWidget } from 'react-pluggy-connect';

export const PluggyConnect = ({ onConnectionSuccess }: { onConnectionSuccess?: () => void }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const { syncData } = usePluggySync();

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      // Get connect token from edge function
      const { data, error } = await supabase.functions.invoke("pluggy-create-connect-token");

      if (error) {
        console.error("Error getting connect token:", error);
        toast.error("Erro ao obter token de conexão");
        setIsConnecting(false);
        return;
      }

      setConnectToken(data.connectToken);
    } catch (error) {
      console.error("Error initiating connection:", error);
      toast.error("Erro ao iniciar conexão");
      setIsConnecting(false);
    }
  };

  const handleSuccess = async (itemData: any) => {
    console.log("Connection successful:", itemData);
    toast.success("Instituição conectada com sucesso!");
    
    setIsConnecting(false);
    setConnectToken(null);
    
    // Sync data immediately after connection
    try {
      syncData(itemData.item.id);
      onConnectionSuccess?.();
    } catch (syncError) {
      console.error("Sync error:", syncError);
      toast.error("Erro ao sincronizar dados");
    }
  };

  const handleError = (error: any) => {
    console.error("Connection error:", error);
    toast.error("Erro ao conectar instituição");
    setIsConnecting(false);
    setConnectToken(null);
  };

  const handleClose = () => {
    setIsConnecting(false);
    setConnectToken(null);
  };

  return (
    <>
      {connectToken && (
        <PluggyConnectWidget
          connectToken={connectToken}
          onSuccess={handleSuccess}
          onError={handleError}
          onClose={handleClose}
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Conectar Instituição Financeira
          </CardTitle>
          <CardDescription>
            Conecte suas contas bancárias, cartões de crédito e investimentos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Link2 className="mr-2 h-4 w-4" />
                Conectar Instituição
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </>
  );
};
