import { useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
}

export const EmailTemplatesManager = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedHtml, setEditedHtml] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (template: EmailTemplate) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: editedSubject,
          html_content: editedHtml,
        })
        .eq("id", template.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template atualizado com sucesso!");
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar template");
      console.error(error);
    },
  });

  const handleSelectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedHtml(template.html_content);
  };

  const handleSave = () => {
    if (selectedTemplate) {
      updateTemplate.mutate(selectedTemplate);
    }
  };

  const handlePreview = () => {
    setPreviewOpen(true);
  };

  const getPreviewHtml = useMemo(() => {
    let preview = editedHtml;
    if (selectedTemplate) {
      selectedTemplate.variables.forEach((variable) => {
        const regex = new RegExp(`{{${variable}}}`, "g");
        preview = preview.replace(regex, `<strong>[${variable}]</strong>`);
      });
    }
    // Sanitize HTML to prevent XSS attacks
    return DOMPurify.sanitize(preview, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
      ALLOWED_ATTR: ['href', 'style', 'class']
    });
  }, [editedHtml, selectedTemplate]);

  if (isLoading) {
    return <div>Carregando templates...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestão de Templates de Email</h2>
        <p className="text-muted-foreground">
          Edite os templates de email que são enviados automaticamente pelo sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Templates */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Templates Disponíveis</CardTitle>
            <CardDescription>Clique em um template para editar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates?.map((template) => (
              <Button
                key={template.id}
                variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => handleSelectTemplate(template)}
              >
                <Mail className="mr-2 h-4 w-4" />
                <span className="flex-1 text-left">{template.name}</span>
                {template.is_active && (
                  <Badge variant="secondary" className="ml-2">Ativo</Badge>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedTemplate ? `Editar: ${selectedTemplate.name}` : "Selecione um Template"}
            </CardTitle>
            {selectedTemplate?.description && (
              <CardDescription>{selectedTemplate.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {selectedTemplate ? (
              <Tabs defaultValue="edit" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="edit">
                    <Code className="mr-2 h-4 w-4" />
                    Editar
                  </TabsTrigger>
                  <TabsTrigger value="variables">
                    Variáveis
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="edit" className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg mb-4">
                    <p className="text-sm font-medium mb-2">Variáveis Disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables.map((variable) => (
                        <code key={variable} className="px-2 py-1 bg-background rounded text-xs">
                          {`{{${variable}}}`}
                        </code>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use {`{{variableName}}`} para inserir variáveis no texto.
                      {(selectedTemplate.template_key === 'monthly_report' || 
                        selectedTemplate.template_key === 'portfolio_alerts') && 
                        ' Para arrays, use {{#each arrayName}}...{{/each}}'
                      }
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto do Email</Label>
                    <Input
                      id="subject"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      placeholder="Assunto do email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="html">Conteúdo HTML</Label>
                    <Textarea
                      id="html"
                      value={editedHtml}
                      onChange={(e) => setEditedHtml(e.target.value)}
                      placeholder="Conteúdo HTML do email"
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={updateTemplate.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </Button>
                    <Button variant="outline" onClick={handlePreview}>
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="variables" className="space-y-4">
                  <div className="bg-muted/50 p-6 rounded-lg space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Sintaxe de Variáveis</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Use a sintaxe <code className="px-1 py-0.5 bg-background rounded">{`{{variableName}}`}</code> para inserir variáveis dinâmicas em seus templates.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium mb-2">Variáveis Disponíveis:</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedTemplate.variables.map((variable) => (
                            <Badge key={variable} variant="secondary" className="justify-center py-2">
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {(selectedTemplate.template_key === 'monthly_report' || 
                        selectedTemplate.template_key === 'portfolio_alerts') && (
                        <div className="border-t pt-3">
                          <h4 className="text-sm font-medium mb-2">Loops (Arrays):</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            Para iterar sobre arrays, use a sintaxe:
                          </p>
                          <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`{{#each arrayName}}
  <div>
    <p>{{propertyName}}</p>
  </div>
{{/each}}`}
                          </pre>
                          {selectedTemplate.template_key === 'monthly_report' && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Exemplo: <code className="px-1 bg-background rounded">{`{{#each topAssets}}`}</code> para iterar sobre os melhores ativos.
                            </p>
                          )}
                          {selectedTemplate.template_key === 'portfolio_alerts' && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Exemplo: <code className="px-1 bg-background rounded">{`{{#each alerts}}`}</code> para iterar sobre os alertas.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="border-t pt-3">
                        <h4 className="text-sm font-medium mb-2">Exemplo de Uso:</h4>
                        <pre className="bg-background p-3 rounded text-xs overflow-x-auto">
{`<p>Olá {{userName}}, bem-vindo!</p>
<p>Seu valor é: {{goalValue}}</p>`}
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                Selecione um template da lista para começar a editar
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview do Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assunto:</Label>
              <p className="font-medium">{editedSubject}</p>
            </div>
            <div className="border rounded-lg p-4 bg-background">
              <div dangerouslySetInnerHTML={{ __html: getPreviewHtml }} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
