import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Article {
  id: string;
  title: string;
  excerpt?: string;
  category: string;
  reading_time?: number;
  difficulty_level?: string;
  content: string;
}

interface ArticlesListProps {
  onArticleRead: () => void;
}

export const ArticlesList = ({ onArticleRead }: ArticlesListProps) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('educational_articles')
        .select('*')
        .order('published_at', { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error: any) {
      console.error('Error fetching articles:', error);
      toast({
        title: "Erro ao carregar artigos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level?: string) => {
    switch (level?.toLowerCase()) {
      case "iniciante": return "bg-success/10 text-success";
      case "intermediário": 
      case "intermediario": return "bg-warning/10 text-warning";
      case "avançado": 
      case "avancado": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const handleReadArticle = (article: Article) => {
    setSelectedArticle(article);
    onArticleRead();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground text-center">
            Nenhum artigo disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {articles.map((article) => (
          <Card key={article.id} className="hover:border-primary transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between mb-2">
                <Badge variant="secondary">{article.category}</Badge>
                {article.difficulty_level && (
                  <Badge className={getLevelColor(article.difficulty_level)}>
                    {article.difficulty_level}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl">{article.title}</CardTitle>
              {article.excerpt && (
                <CardDescription>{article.excerpt}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {article.reading_time && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{article.reading_time} min de leitura</span>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleReadArticle(article)}
                >
                  Ler artigo
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl mb-2">{selectedArticle?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-4">
              <Badge variant="secondary">{selectedArticle?.category}</Badge>
              {selectedArticle?.difficulty_level && (
                <Badge className={getLevelColor(selectedArticle.difficulty_level)}>
                  {selectedArticle.difficulty_level}
                </Badge>
              )}
              {selectedArticle?.reading_time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedArticle.reading_time} min
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm max-w-none mt-4 dark:prose-invert">
            {selectedArticle?.content.split('\n').map((line, i) => {
              if (line.startsWith('# ')) {
                return <h1 key={i} className="text-2xl font-bold mt-6 mb-4">{line.slice(2)}</h1>;
              }
              if (line.startsWith('## ')) {
                return <h2 key={i} className="text-xl font-semibold mt-5 mb-3">{line.slice(3)}</h2>;
              }
              if (line.startsWith('### ')) {
                return <h3 key={i} className="text-lg font-semibold mt-4 mb-2">{line.slice(4)}</h3>;
              }
              if (line.startsWith('**') && line.endsWith('**')) {
                return <p key={i} className="font-semibold mt-3 mb-1">{line.slice(2, -2)}</p>;
              }
              if (line.startsWith('- ')) {
                return <li key={i} className="ml-4">{line.slice(2)}</li>;
              }
              if (line.match(/^\d+\./)) {
                return <li key={i} className="ml-4">{line.slice(line.indexOf('.') + 2)}</li>;
              }
              if (line.trim() === '') {
                return <br key={i} />;
              }
              return <p key={i} className="mb-2">{line}</p>;
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
