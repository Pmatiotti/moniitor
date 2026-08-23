import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserCog, LogOut } from "lucide-react";
import { toast } from "sonner";

export const ImpersonationBanner = () => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    // Check if we're in impersonation mode by looking at localStorage
    const checkImpersonation = () => {
      const isImpersonating = localStorage.getItem('is_impersonating') === 'true';
      const adminEmailStored = localStorage.getItem('admin_email');
      
      setIsImpersonating(isImpersonating);
      setAdminEmail(adminEmailStored || '');
    };

    checkImpersonation();
    
    // Listen for storage changes (in case of multiple tabs)
    window.addEventListener('storage', checkImpersonation);
    return () => window.removeEventListener('storage', checkImpersonation);
  }, []);

  const handleReturnToAdmin = async () => {
    try {
      // Get saved admin session from localStorage
      const adminSessionStr = localStorage.getItem('admin_session_backup');
      const impersonationToken = localStorage.getItem('impersonation_token');
      
      if (!adminSessionStr) {
        toast.error('Sessão admin não encontrada');
        return;
      }

      const adminSession = JSON.parse(adminSessionStr);
      
      // Call end-impersonation to log audit and cleanup
      await supabase.functions.invoke('end-impersonation', {
        body: { impersonationToken }
      });

      // Restore admin session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });

      if (sessionError) {
        console.error('Error restoring admin session:', sessionError);
        toast.error('Erro ao restaurar sessão admin');
        return;
      }

      // Clear impersonation from localStorage
      localStorage.removeItem('is_impersonating');
      localStorage.removeItem('admin_email');
      localStorage.removeItem('admin_session_backup');
      localStorage.removeItem('impersonation_token');

      toast.success('Retornado para conta admin');
      
      setTimeout(() => {
        window.location.href = '/admin';
      }, 500);
    } catch (error) {
      console.error('Error returning to admin:', error);
      toast.error('Erro ao retornar para admin');
    }
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <Alert className="border-warning bg-warning/10 rounded-none border-b">
      <UserCog className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between w-full">
        <span className="font-medium">
          Você está impersonando outro usuário. Admin original: {adminEmail}
        </span>
        <Button
          onClick={handleReturnToAdmin}
          variant="outline"
          size="sm"
          className="ml-4"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Voltar para Admin
        </Button>
      </AlertDescription>
    </Alert>
  );
};
