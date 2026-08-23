import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, KeyRound, Loader2, ArrowLeft } from "lucide-react";
import { useSubscription, PLAN_PRICES } from "@/hooks/useSubscription";
import { PasswordInput } from "@/components/ui/password-input";
import { Checkbox } from "@/components/ui/checkbox";
import { validatePassword, checkPasswordBreached } from "@/lib/password-validation";

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
    <g transform="matrix(1, 0, 0, 1, 0, 0)">
      <path fill="#EA4335" d="M5.26620003,9.76452941 C6.19878754,6.93863203 8.85444915,4.90909091 12,4.90909091 C13.6909091,4.90909091 15.2181818,5.50909091 16.4181818,6.49090909 L19.9090909,3 C17.7818182,1.14545455 15.0545455,0 12,0 C7.27006974,0 3.1977497,2.69829785 1.23999023,6.65002441 L5.26620003,9.76452941 Z"/>
      <path fill="#34A853" d="M16.0407269,18.0125889 C14.9509167,18.7163016 13.5660892,19.0909091 12,19.0909091 C8.86648613,19.0909091 6.21911939,17.076871 5.27698177,14.2678769 L1.23746264,17.3349879 C3.19279051,21.2936293 7.26500293,24 12,24 C14.9328362,24 17.7353462,22.9573905 19.834192,20.9995801 L16.0407269,18.0125889 Z"/>
      <path fill="#4A90E2" d="M19.834192,20.9995801 C22.0291676,18.9520994 23.4545455,15.903663 23.4545455,12 C23.4545455,11.2909091 23.3454545,10.5272727 23.1818182,9.81818182 L12,9.81818182 L12,14.4545455 L18.4363636,14.4545455 C18.1187732,16.013626 17.2662994,17.2212117 16.0407269,18.0125889 L19.834192,20.9995801 Z"/>
      <path fill="#FBBC05" d="M5.27698177,14.2678769 C5.03832634,13.556323 4.90909091,12.7937589 4.90909091,12 C4.90909091,11.2182781 5.03443647,10.4668121 5.26620003,9.76452941 L1.23999023,6.65002441 C0.43658717,8.26043162 0,10.0753848 0,12 C0,13.9195484 0.444780743,15.7## L1.23746264,17.3349879 L5.27698177,14.2678769 Z"/>
    </g>
  </svg>
);

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { createCheckoutSession } = useSubscription();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isCustomReset, setIsCustomReset] = useState(false);
  const [customResetToken, setCustomResetToken] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const selectedPlan = location.state?.selectedPlan;

  useEffect(() => {
    // Check for custom reset token in URL
    const searchParams = new URLSearchParams(location.search);
    const resetToken = searchParams.get('reset');
    
    if (resetToken) {
      validateCustomResetToken(resetToken);
      return;
    }

    // Check URL hash for recovery token (legacy supabase flow)
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    
    if (type === 'recovery' && accessToken) {
      setIsPasswordRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        return;
      }
      
      if (session && !isPasswordRecovery && !isCustomReset) {
        navigate("/dashboard");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isPasswordRecovery && !isCustomReset && !window.location.hash.includes('type=recovery')) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isPasswordRecovery, isCustomReset, location.search]);

  const validateCustomResetToken = async (token: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-reset-token', {
        body: { token },
      });

      if (error || !data?.valid) {
        toast({
          title: "Link inválido",
          description: data?.message || "Este link de recuperação é inválido ou expirou.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      setCustomResetToken(token);
      setResetEmail(data.email);
      setIsCustomReset(true);
    } catch (err) {
      toast({
        title: "Erro",
        description: "Não foi possível validar o link de recuperação.",
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleCustomPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Senha inválida",
        description: passwordValidation.errors[0],
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const breachCheck = await checkPasswordBreached(password);
    if (breachCheck.isBreached) {
      toast({
        title: "Senha comprometida",
        description: `Esta senha foi encontrada em ${breachCheck.count.toLocaleString('pt-BR')} vazamentos de dados.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('validate-reset-token', {
        body: { token: customResetToken, newPassword: password },
      });

      if (error || !data?.success) {
        throw new Error(data?.message || "Erro ao atualizar senha");
      }

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Faça login com sua nova senha.",
      });

      setIsCustomReset(false);
      setCustomResetToken(null);
      setPassword("");
      setConfirmPassword("");
      window.history.replaceState(null, '', '/auth');
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: err.message,
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Senha inválida",
        description: passwordValidation.errors[0],
        variant: "destructive",
      });
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A nova senha e a confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Check if password has been breached
    const breachCheck = await checkPasswordBreached(password);
    if (breachCheck.isBreached) {
      toast({
        title: "Senha comprometida",
        description: `Esta senha foi encontrada em ${breachCheck.count.toLocaleString('pt-BR')} vazamentos de dados. Por favor, escolha outra senha.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso. Você será redirecionado.",
      });

      // Clear the hash from URL
      window.history.replaceState(null, '', window.location.pathname);
      
      setIsPasswordRecovery(false);
      setPassword("");
      setConfirmPassword("");
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar senha",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Senha inválida",
        description: passwordValidation.errors[0],
        variant: "destructive",
      });
      return;
    }

    // Validar termos
    if (!acceptedTerms) {
      toast({
        title: "Termos não aceitos",
        description: "Você precisa aceitar os termos de uso e política de privacidade para continuar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Check if password has been breached
    const breachCheck = await checkPasswordBreached(password);
    if (breachCheck.isBreached) {
      toast({
        title: "Senha comprometida",
        description: `Esta senha foi encontrada em ${breachCheck.count.toLocaleString('pt-BR')} vazamentos de dados. Por favor, escolha outra senha mais segura.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Com auto-confirm ativo, enviar email de verificação customizado
    if (data.user) {
      try {
        await supabase.functions.invoke('send-verification-email', {
          body: { userId: data.user.id, email, type: 'signup' },
        });
      } catch (emailError) {
        console.error('Erro ao enviar email de verificação:', emailError);
      }
    }

    toast({
      title: "Conta criada com sucesso!",
      description: "Enviamos um email de verificação. Por favor, verifique sua caixa de entrada.",
    });
    
    // Redirecionar para dashboard
    navigate('/dashboard');
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Verificar se é o primeiro login e enviar email de boas-vindas
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('welcome_email_sent, full_name')
          .eq('id', data.user.id)
          .single();

        // Enviar email de boas-vindas se ainda não foi enviado
        if (profile && !profile.welcome_email_sent) {
          try {
            await supabase.functions.invoke('send-welcome-email', {
              body: {
                userName: profile.full_name || email.split('@')[0],
                userEmail: email,
              },
            });

            // Marcar como enviado
            await supabase
              .from('profiles')
              .update({ welcome_email_sent: true })
              .eq('id', data.user.id);
          } catch (emailError) {
            console.error('Erro ao enviar email de boas-vindas:', emailError);
            // Não bloquear o login se o email falhar
          }
        }
      }
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email necessário",
        description: "Digite seu email para recuperar a senha",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { email },
      });

      if (error) throw error;

      toast({
        title: "Email enviado!",
        description: "Se o email existir, você receberá as instruções para redefinir sua senha.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Erro ao entrar com Google",
        description: error.message,
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  // Custom Password Reset Form (from email link)
  if (isCustomReset) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao início</span>
        </Link>
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha para a conta {resetEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCustomPasswordReset} className="space-y-4">
              <div className="space-y-2">
                <PasswordInput
                  id="new-password"
                  label="Nova Senha"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  required
                  showStrength={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">As senhas não conferem</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Atualizando..." : "Atualizar Senha"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsCustomReset(false);
                  setCustomResetToken(null);
                  setPassword("");
                  setConfirmPassword("");
                  window.history.replaceState(null, '', '/auth');
                }}
                disabled={loading}
              >
                Voltar ao login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password Recovery Form (legacy Supabase flow)
  if (isPasswordRecovery) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
        <Link 
          to="/" 
          className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar ao início</span>
        </Link>
        <Card className="w-full max-w-md border-border/50 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <KeyRound className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Redefinir Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha abaixo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <PasswordInput
                  id="new-password"
                  label="Nova Senha"
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  required
                  showStrength={true}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">As senhas não conferem</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Atualizando..." : "Atualizar Senha"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsPasswordRecovery(false);
                  setPassword("");
                  setConfirmPassword("");
                  window.history.replaceState(null, '', window.location.pathname);
                }}
                disabled={loading}
              >
                Voltar ao login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar ao início</span>
      </Link>
      <Card className="w-full max-w-md border-border/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">MONIITOR</CardTitle>
          <CardDescription>
            {isSignUp ? "Crie sua conta e comece agora" : "Plataforma de gestão patrimonial premium"}
          </CardDescription>
          {selectedPlan && (
            <div className="mt-2 text-sm text-muted-foreground">
              Plano selecionado: <span className="font-semibold text-primary">{selectedPlan}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <PasswordInput
                id="password"
                label="Senha"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
                showStrength={isSignUp}
              />
            </div>
            {isSignUp && (
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                />
                <label
                  htmlFor="terms"
                  className="text-sm text-muted-foreground leading-none cursor-pointer"
                >
                  Aceito os{" "}
                  <a href="/termos" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    termos de uso
                  </a>{" "}
                  e{" "}
                  <a href="/privacidade" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    política de privacidade
                  </a>
                </label>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
              {loading ? (isSignUp ? "Criando conta..." : "Entrando...") : (isSignUp ? "Criar conta" : "Entrar")}
            </Button>
            {!isSignUp && (
              <Button 
                type="button" 
                variant="link" 
                className="w-full text-sm text-muted-foreground"
                onClick={handleForgotPassword}
                disabled={loading || googleLoading}
              >
                Esqueceu sua senha?
              </Button>
            )}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  ou continue com
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-3 h-11 font-medium"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              {googleLoading ? "Conectando..." : "Entrar com Google"}
            </Button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={loading || googleLoading}
            >
              {isSignUp ? "Fazer login" : "Criar conta"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
