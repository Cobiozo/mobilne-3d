import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Plus, Trash2, Edit2, Pin, PinOff, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface AdminNote {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'important' | 'todo' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  due_date: string | null;
  tags: string[] | null;
}

export const NotesManagement = () => {
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<AdminNote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { language } = useApp();

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as AdminNote['category'],
    priority: 'normal' as AdminNote['priority'],
    due_date: '',
    tags: ''
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes((data || []) as AdminNote[]);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się pobrać notatek',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: getText('error', language),
        description: 'Tytuł i treść są wymagane',
        variant: 'destructive',
      });
      return;
    }

    try {
      const noteData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        priority: formData.priority,
        due_date: formData.due_date || null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : null
      };

      if (editingNote) {
        const { error } = await supabase
          .from('admin_notes')
          .update(noteData)
          .eq('id', editingNote.id);

        if (error) throw error;

        toast({
          title: getText('success', language),
          description: 'Notatka została zaktualizowana',
        });
      } else {
        const { error } = await supabase
          .from('admin_notes')
          .insert(noteData);

        if (error) throw error;

        toast({
          title: getText('success', language),
          description: 'Notatka została utworzona',
        });
      }

      resetForm();
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się zapisać notatki',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć tę notatkę?')) return;

    try {
      const { error } = await supabase
        .from('admin_notes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Notatka została usunięta',
      });

      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się usunąć notatki',
        variant: 'destructive',
      });
    }
  };

  const togglePin = async (note: AdminNote) => {
    try {
      const { error } = await supabase
        .from('admin_notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: note.is_pinned ? 'Notatka odpięta' : 'Notatka przypięta',
      });

      fetchNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się zmienić przypięcia',
        variant: 'destructive',
      });
    }
  };

  const startEdit = (note: AdminNote) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      content: note.content,
      category: note.category,
      priority: note.priority,
      due_date: note.due_date ? format(new Date(note.due_date), 'yyyy-MM-dd') : '',
      tags: note.tags?.join(', ') || ''
    });
    setIsCreating(true);
  };

  const resetForm = () => {
    setEditingNote(null);
    setIsCreating(false);
    setFormData({
      title: '',
      content: '',
      category: 'general',
      priority: 'normal',
      due_date: '',
      tags: ''
    });
  };

  const getCategoryBadgeVariant = (category: string) => {
    switch (category) {
      case 'important': return 'destructive';
      case 'todo': return 'default';
      case 'reminder': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'normal': return 'text-blue-600';
      case 'low': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Notatki administracyjne</h2>
          <p className="text-muted-foreground">
            Zarządzaj notatkami i przypomnieniami dla zespołu administracyjnego
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nowa notatka
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingNote ? 'Edytuj notatkę' : 'Nowa notatka'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Tytuł notatki"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as AdminNote['category'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Ogólne</SelectItem>
                    <SelectItem value="important">Ważne</SelectItem>
                    <SelectItem value="todo">Do zrobienia</SelectItem>
                    <SelectItem value="reminder">Przypomnienie</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as AdminNote['priority'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niski priorytet</SelectItem>
                    <SelectItem value="normal">Normalny</SelectItem>
                    <SelectItem value="high">Wysoki</SelectItem>
                    <SelectItem value="urgent">Pilne</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Textarea
                  placeholder="Treść notatki"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Termin</label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Tagi (oddzielone przecinkami)</label>
                  <Input
                    placeholder="np. spotkanie, projekt, klient"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingNote ? 'Zapisz zmiany' : 'Utwórz notatkę'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Anuluj
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {notes.map((note) => (
          <Card key={note.id} className={note.is_pinned ? 'border-primary' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {note.is_pinned && <Pin className="w-4 h-4 text-primary" />}
                    <CardTitle className="text-lg">{note.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={getCategoryBadgeVariant(note.category)}>
                      {note.category}
                    </Badge>
                    <Badge className={getPriorityColor(note.priority)} variant="outline">
                      {note.priority}
                    </Badge>
                    {note.due_date && (
                      <Badge variant="outline">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(note.due_date), 'dd.MM.yyyy')}
                      </Badge>
                    )}
                    {note.tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePin(note)}
                  >
                    {note.is_pinned ? (
                      <PinOff className="w-4 h-4" />
                    ) : (
                      <Pin className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEdit(note)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-muted-foreground mt-4">
                Utworzono: {format(new Date(note.created_at), 'dd.MM.yyyy HH:mm')}
              </p>
            </CardContent>
          </Card>
        ))}

        {notes.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Brak notatek</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};