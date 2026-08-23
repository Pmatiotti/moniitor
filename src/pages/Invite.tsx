import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { TrendingUp, CheckCircle } from "lucide-react";
import { validatePassword, checkPasswordBreached } from "@/lib/password-validation";

interface InvitationData {
  valid: boolean;
  reason?: string;
  email?: string;
  role?: string;
}

const Invite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    if (!token) {
      toast.error("Token de convite inválido");
      navigate('/auth');
      return;
    }

    try {
      // Use secure RPC function instead of direct table access
      const { data, error } = await supabase.rpc('validate_invitation_token', {
        p_token: token
      });

      if (error) throw error;

      const result = data as unknown as InvitationData;

      if (!result.valid) {
        const errorMessages: Record<string, string> = {
          not_found: "Convite não encontrado",
          already_accepted: "Este convite já foi aceito",
          expired: "Este convite expirou"
        };
        toast.error(errorMessages[result.reason || ''] || "Convite inválido");
        navigate('/auth');
        return;
      }

      setInvitation(result);
    } catch (error: any) {
      console.error('Error validating invitation:', error);
      toast.error("Erro ao validar convite");
      navigate('/auth');
    } finally {
      setValidating(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password locally
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast.error("Senha inválida", {
        description: passwordValidation.errors.join(". "),
      });
      return;
    }

    if (!invitation?.email) {
      toast.error("Dados do convite inválidos");
      return;
    }

    setLoading(true);

    try {
      // Check if password has been breached (HIBP)
      const breachCheck = await checkPasswordBreached(password);
      if (breachCheck.isBreached) {
        toast.error("Senha comprometida", {
          description: `Esta senha foi encontrada em ${breachCheck.count.toLocaleString()} vazamentos de dados. Por favor, escolha outra senha.`,
        });
        setLoading(false);
        return;
      }

      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Failed to create user');
      }

      // Mark invitation as accepted using secure RPC function
      const { data: acceptResult, error: acceptError } = await supabase.rpc('accept_invitation', {
        p_token: token
      });

      if (acceptError) {
        console.error('Error accepting invitation:', acceptError);
      } else {
        const result = acceptResult as { success: boolean; reason?: string };
        if (!result.success) {
          console.error('Failed to mark invitation as accepted:', result.reason);
        }
      }

      // Send welcome email
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: {
            userName: fullName,
            userEmail: invitation.email,
          },
        });

        // Mark welcome email as sent
        await supabase
          .from('profiles')
          .update({ welcome_email_sent: true })
          .eq('id', authData.user.id);
      } catch (emailError) {
        console.error('Erro ao enviar email de boas-vindas:', emailError);
        // Don't block account creation if email fails
      }

      toast.success("Conta criada com sucesso!", {
        description: "Você já pode fazer login",
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error("Erro ao aceitar convite", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!invitation || !invitation.valid) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">MONIITOR</CardTitle>
          <CardDescription>
            Você foi convidado como <strong>{invitation.role}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-primary/5 rounded-lg flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium">Convite válido para:</p>
              <p className="text-sm text-muted-foreground">{invitation.email}</p>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>
            <PasswordInput
              value={password}
              onChange={setPassword}
              label="Senha"
              placeholder="Mínimo 8 caracteres"
              showStrength={true}
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta..." : "Aceitar Convite"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Invite;
