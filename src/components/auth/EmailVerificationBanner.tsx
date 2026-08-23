import { useState } from "react";
import { Mail, X } from "lucide-react";

interface EmailVerificationBannerProps {
  userId: string;
  email: string;
  onDismiss?: () => void;
}

export const EmailVerificationBanner = ({ userId, email, onDismiss }: EmailVerificationBannerProps) => {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 animate-fade-in">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
          <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-amber-800 dark:text-amber-200">
            Verifique seu email
          </h4>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Enviamos um email de verificação para <strong>{email}</strong>. Por favor, confirme seu endereço para garantir a segurança da sua conta.
          </p>
        </div>
      </div>
    </div>
  );
};
