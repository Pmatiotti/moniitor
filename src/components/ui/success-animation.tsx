import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  className?: string;
}

export const SuccessAnimation = ({ show, message, className }: SuccessAnimationProps) => {
  if (!show) return null;

  return (
    <div className={cn(
      "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm",
      className
    )}>
      <div className="flex flex-col items-center gap-4 animate-scale-in">
        <div className="rounded-full bg-green-500/20 p-6">
          <CheckCircle className="h-16 w-16 text-green-500 animate-check-mark" />
        </div>
        {message && (
          <p className="text-lg font-medium text-foreground animate-fade-in">{message}</p>
        )}
      </div>
    </div>
  );
};
