import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Sparkles, X, Minimize2, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLocation } from "react-router-dom";

type Message = {
  role: "user" | "assistant";
  content: string;
};

interface FloatingAIAssistantProps {
  contextData?: any;
}

export const FloatingAIAssistant = ({ contextData }: FloatingAIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const location = useLocation();

  // Gerar mensagem inicial contextual baseada na página
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const contextMessage = getContextualGreeting();
      setMessages([{ role: "assistant", content: contextMessage }]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getContextualGreeting = () => {
    const path = location.pathname;
    const greetings: Record<string, string> = {
      "/dashboard": "👋 Olá! Estou aqui para ajudar com análises do seu dashboard. Posso explicar métricas, sugerir ações ou responder dúvidas sobre seus investimentos.",
      "/portfolio": "📊 Analisando seu portfólio! Posso ajudar com alocação de ativos, diversificação, análise de risco ou sugestões de rebalanceamento.",
      "/goals": "🎯 Vamos falar sobre suas metas! Posso calcular projeções, sugerir estratégias de aportes ou analisar o progresso das suas metas.",
      "/crm": "👥 Assistente CRM ativado! Posso ajudar com análises de clientes, identificar oportunidades, gerar insights ou sugerir próximas ações.",
      "/finances": "💰 Gerenciando suas finanças! Posso analisar fluxo de caixa, categorizar gastos, sugerir orçamentos ou identificar oportunidades de economia.",
      "/dividends": "💸 Analisando dividendos! Posso projetar receitas futuras, identificar pagadores consistentes ou sugerir estratégias de renda passiva.",
      "/performance": "📈 Avaliando performance! Posso comparar com benchmarks, analisar métricas de risco-retorno ou identificar pontos de melhoria.",
      "/planning": "🧮 Planejamento financeiro! Posso ajudar com simulações, cálculos de juros compostos ou estratégias de longo prazo.",
    };
    return greetings[path] || "👋 Olá! Sou seu assistente financeiro inteligente. Como posso ajudar hoje?";
  };

  const streamChat = async (userMessages: Message[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Você precisa estar autenticado.");
    }

    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/portfolio-assistant`;
    
    // Adicionar contexto da página atual
    const contextualMessages = [
      ...userMessages,
      ...(contextData ? [{
        role: "system" as const,
        content: `Contexto atual: ${JSON.stringify(contextData)}`
      }] : [])
    ];

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ messages: contextualMessages }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        throw new Error("Limite de requisições excedido. Tente novamente em alguns instantes.");
      }
      if (resp.status === 402) {
        throw new Error("Créditos insuficientes. Entre em contato com o suporte.");
      }
      throw new Error("Erro ao conectar com o assistente.");
    }

    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let streamDone = false;
    let assistantContent = "";

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
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantContent += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant" && prev.length > 1) {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat([...messages, userMessage]);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="floating-ai-button fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 z-50"
        size="icon"
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    );
  }

  if (isMinimized) {
    return (
      <Card className="fixed bottom-6 right-6 z-50 shadow-2xl border-primary/30">
        <div className="flex items-center gap-2 p-3">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="text-sm font-medium">Assistente IA</span>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(false)}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-[400px] h-[600px] flex flex-col z-50 shadow-2xl border-primary/30 bg-gradient-to-br from-card to-card/95">
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-primary/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <h3 className="font-semibold text-foreground">Assistente IA</h3>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setIsOpen(false);
              setMessages([]);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-foreground border border-border/30"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-lg p-3 border border-border/30">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 bg-muted/20">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pergunte qualquer coisa..."
            disabled={isLoading}
            className="bg-background/80"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
            className="bg-primary hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Assistente com contexto da página atual
        </p>
      </div>
    </Card>
  );
};