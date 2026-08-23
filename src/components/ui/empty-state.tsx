import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) => {
  return (
    <Card className={cn("border-dashed border-2 bg-muted/20 animate-fade-in", className)}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        <div className="rounded-full bg-primary/10 p-4 mb-6 animate-bounce-soft">
          <Icon className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-xl font-semibold mb-2 text-center">{title}</h3>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          {description}
        </p>
        <div className="flex gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="lg" className="transition-all hover:scale-105">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="outline" size="lg" className="transition-all hover:scale-105">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
