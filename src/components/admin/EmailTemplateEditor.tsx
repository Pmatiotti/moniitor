import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Save, Eye, Code } from "lucide-react";
import DOMPurify from "dompurify";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  subject: string;
  html_content: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function EmailTemplateEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const selectedTemplateData = templates?.find(t => t.id === selectedTemplate);

  const updateMutation = useMutation({
    mutationFn: async (values: Partial<EmailTemplate>) => {
      if (!selectedTemplate) return;
      
      const { error } = await supabase
        .from('email_templates')
        .update(values)
        .eq('id', selectedTemplate);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success("Template atualizado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar template: ${error.message}`);
    },
  });

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateMutation.mutate({
      subject: formData.get('subject') as string,
      html_content: formData.get('html_content') as string,
    });
  };

  const renderPreview = () => {
    if (!selectedTemplateData) return null;
    
    let html = selectedTemplateData.html_content;
    
    // Replace variables with example values
    selectedTemplateData.variables.forEach(variable => {
      const exampleValues: Record<string, string> = {
        userName: 'João Silva',
        userEmail: 'joao@example.com',
        planName: 'Premium',
        planPrice: 'R$ 99,90',
        nextBillingDate: '01/01/2025',
        goalName: 'Casa Própria',
        goalValue: 'R$ 500.000,00',
        achievedDate: '15/12/2024',
        monthsToAchieve: '24 meses',
        planType: 'Premium',
        renewalDate: '01/01/2025',
        portfolioValue: 'R$ 150.000,00',
        monthlyReturn: '+5.2',
      };
      
      const regex = new RegExp(`{{${variable}}}`, 'g');
      html = html.replace(regex, exampleValues[variable] || `[${variable}]`);
    });
    
    const sanitizedHtml = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'img'],
      ALLOWED_ATTR: ['href', 'style', 'class', 'src', 'alt', 'width', 'height']
    });
    
    return (
      <iframe
        srcDoc={sanitizedHtml}
        sandbox="allow-same-origin"
        className="w-full h-[600px] border rounded-lg"
        title="Preview do Email"
      />
    );
  };

  if (isLoading) {
    return <div>Carregando templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {templates?.map((template) => (
          <Card
            key={template.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedTemplate === template.id ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => {
              setSelectedTemplate(template.id);
              setPreviewMode(false);
            }}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Mail className="h-5 w-5 text-muted-foreground" />
                {template.is_active && (
                  <Badge variant="secondary">Ativo</Badge>
                )}
              </div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-sm">
                {template.description}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {selectedTemplateData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Editar: {selectedTemplateData.name}</CardTitle>
                <CardDescription>
                  Variáveis disponíveis:{' '}
                  {selectedTemplateData.variables.map((v, i) => (
                    <Badge key={v} variant="outline" className="ml-1">
                      {`{{${v}}}`}
                    </Badge>
                  ))}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={previewMode ? "default" : "outline"}
                  onClick={() => setPreviewMode(true)}
                  type="button"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant={!previewMode ? "default" : "outline"}
                  onClick={() => setPreviewMode(false)}
                  type="button"
                >
                  <Code className="h-4 w-4 mr-2" />
                  Código
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {previewMode ? (
              renderPreview()
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto do Email</Label>
                  <Input
                    id="subject"
                    name="subject"
                    defaultValue={selectedTemplateData.subject}
                    placeholder="Assunto do email..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="html_content">HTML do Template</Label>
                  <Textarea
                    id="html_content"
                    name="html_content"
                    defaultValue={selectedTemplateData.html_content}
                    className="font-mono text-sm min-h-[400px]"
                    placeholder="HTML do email..."
                  />
                </div>

                <Button type="submit" disabled={updateMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
