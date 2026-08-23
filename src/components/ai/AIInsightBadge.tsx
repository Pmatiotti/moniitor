import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AIInsightBadgeProps {
  prompt: string;
  triggerLabel?: string;
  contextData?: any;
}

/**
 * Badge clicável que gera insights rápidos de IA inline
 * Útil para adicionar em cards e componentes sem ocupar muito espaço
 */
export const AIInsightBadge = ({ 
  prompt, 
  triggerLabel = "✨ Insight IA",
  contextData 
}: AIInsightBadgeProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const { toast } = useToast();

  const generateInsight = async () => {
    if (insight) {
      setInsight(null);
      return;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-assistant`;
      
      const messages = [{
        role: "user" as const,
        content: contextData 
          ? `${prompt}\n\nContexto: ${JSON.stringify(contextData)}`
          : prompt
      }];

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages }),
      });

      if (!resp.ok) throw new Error("Erro ao gerar insight");
      if (!resp.body) throw new Error("No response");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let content = "";

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setInsight(content);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Badge
        variant="outline"
        className="cursor-pointer hover:bg-primary/10 transition-colors border-primary/30"
        onClick={generateInsight}
      >
        {isLoading ? (
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-3 w-3 mr-1" />
        )}
        {triggerLabel}
      </Badge>

      {insight && (
        <Card className="bg-primary/5 border-primary/20 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6"
            onClick={() => setInsight(null)}
          >
            <X className="h-3 w-3" />
          </Button>
          <CardContent className="pt-4 pr-8">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground whitespace-pre-wrap">{insight}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};