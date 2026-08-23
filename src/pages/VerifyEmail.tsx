import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Mail } from "lucide-react";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Token de verificação não encontrado.");
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-email-token", {
        body: { token },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMessage(data?.message || "Erro ao verificar email.");
      }
    } catch (error: any) {
      console.error("Error verifying email:", error);
      setStatus("error");
      setErrorMessage(error.message || "Erro ao verificar email.");
    }
  };

  const handleResendEmail = async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      try {
        await supabase.functions.invoke("send-verification-email", {
          body: { userId: user.id, email: user.email },
        });
        setErrorMessage("Um novo email de verificação foi enviado!");
      } catch (error) {
        console.error("Error resending email:", error);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar ao início</span>
      </Link>

      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === "loading" && (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            )}
            {status === "success" && (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            )}
            {status === "error" && (
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === "loading" && "Verificando..."}
            {status === "success" && "Email Verificado!"}
            {status === "error" && "Erro na Verificação"}
          </CardTitle>
          <CardDescription>
            {status === "loading" && "Aguarde enquanto verificamos seu email."}
            {status === "success" && "Seu email foi verificado com sucesso."}
            {status === "error" && errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "success" && (
            <>
              <p className="text-center text-muted-foreground">
                Agora você tem acesso completo à plataforma MONIITOR.
              </p>
              <Button 
                className="w-full" 
                onClick={() => navigate("/dashboard")}
              >
                Ir para o Dashboard
              </Button>
            </>
          )}
          
          {status === "error" && (
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleResendEmail}
              >
                <Mail className="h-4 w-4 mr-2" />
                Reenviar email de verificação
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate("/auth")}
              >
                Voltar para login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
