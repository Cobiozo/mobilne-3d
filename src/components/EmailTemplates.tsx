import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailTemplate {
  id: string;
  template_key: string;
  language: string;
  subject: string;
  html_body: string;
  text_body?: string;
  variables: any;
  is_active: boolean;
}

export const EmailTemplates = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("template_key", { ascending: true })
        .order("language", { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać szablonów",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingTemplate) return;

    try {
      const { error } = editingTemplate.id
        ? await supabase
            .from("email_templates")
            .update(editingTemplate)
            .eq("id", editingTemplate.id)
        : await supabase
            .from("email_templates")
            .insert([editingTemplate]);

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Szablon został zapisany",
      });

      setIsDialogOpen(false);
      setEditingTemplate(null);
      await fetchTemplates();
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się zapisać szablonu",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setIsDialogOpen(true);
  };

  const handleNew = () => {
    setEditingTemplate({
      id: "",
      template_key: "",
      language: "pl",
      subject: "",
      html_body: "",
      text_body: "",
      variables: {},
      is_active: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Szablony emaili</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nowy szablon
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate?.id ? "Edytuj szablon" : "Nowy szablon"}
                </DialogTitle>
              </DialogHeader>
              {editingTemplate && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Klucz szablonu</Label>
                      <Input
                        value={editingTemplate.template_key}
                        onChange={(e) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            template_key: e.target.value,
                          })
                        }
                        placeholder="order_confirmation"
                        disabled={!!editingTemplate.id}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Język</Label>
                      <Select
                        value={editingTemplate.language}
                        onValueChange={(value) =>
                          setEditingTemplate({
                            ...editingTemplate,
                            language: value,
                          })
                        }
                        disabled={!!editingTemplate.id}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pl">Polski</SelectItem>
                          <SelectItem value="en">Angielski</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Temat</Label>
                    <Input
                      value={editingTemplate.subject}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          subject: e.target.value,
                        })
                      }
                      placeholder="Potwierdzenie zamówienia #{{order_number}}"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Treść HTML</Label>
                    <Textarea
                      value={editingTemplate.html_body}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          html_body: e.target.value,
                        })
                      }
                      placeholder="<h1>Witaj {{user_name}}!</h1>"
                      rows={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Treść tekstowa (opcjonalnie)</Label>
                    <Textarea
                      value={editingTemplate.text_body || ""}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          text_body: e.target.value,
                        })
                      }
                      placeholder="Witaj {{user_name}}!"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editingTemplate.is_active}
                      onCheckedChange={(checked) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          is_active: checked,
                        })
                      }
                    />
                    <Label>Aktywny</Label>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSave}>Zapisz</Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingTemplate(null);
                      }}
                    >
                      Anuluj
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klucz</TableHead>
                <TableHead>Język</TableHead>
                <TableHead>Temat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-mono text-sm">
                    {template.template_key}
                  </TableCell>
                  <TableCell>{template.language.toUpperCase()}</TableCell>
                  <TableCell>{template.subject}</TableCell>
                  <TableCell>
                    <span
                      className={
                        template.is_active ? "text-green-600" : "text-gray-400"
                      }
                    >
                      {template.is_active ? "Aktywny" : "Nieaktywny"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(template)}
                    >
                      Edytuj
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};