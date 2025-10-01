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
import { Plus, Trash2, Bell, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  target_users: 'all' | 'admins' | 'users';
  is_read: boolean;
  created_at: string;
  expires_at: string | null;
  action_url: string | null;
  action_label: string | null;
}

export const NotificationsManagement = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { language } = useApp();

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info' as SystemNotification['type'],
    target_users: 'all' as SystemNotification['target_users'],
    expires_at: '',
    action_url: '',
    action_label: ''
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications((data || []) as SystemNotification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się pobrać powiadomień',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: getText('error', language),
        description: 'Tytuł i wiadomość są wymagane',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('system_notifications')
        .insert({
          title: formData.title.trim(),
          message: formData.message.trim(),
          type: formData.type,
          target_users: formData.target_users,
          expires_at: formData.expires_at || null,
          action_url: formData.action_url || null,
          action_label: formData.action_label || null
        });

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Powiadomienie zostało utworzone',
      });

      resetForm();
      fetchNotifications();
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się utworzyć powiadomienia',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć to powiadomienie?')) return;

    try {
      const { error } = await supabase
        .from('system_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: getText('success', language),
        description: 'Powiadomienie zostało usunięte',
      });

      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się usunąć powiadomienia',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setFormData({
      title: '',
      message: '',
      type: 'info',
      target_users: 'all',
      expires_at: '',
      action_url: '',
      action_label: ''
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      case 'success': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Powiadomienia systemowe</h2>
          <p className="text-muted-foreground">
            Zarządzaj powiadomieniami dla użytkowników systemu
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nowe powiadomienie
        </Button>
      </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Nowe powiadomienie</CardTitle>
            <CardDescription>
              Utwórz powiadomienie dla wybranych grup użytkowników
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Tytuł powiadomienia"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div>
                <Textarea
                  placeholder="Treść powiadomienia"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as SystemNotification['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informacja</SelectItem>
                    <SelectItem value="success">Sukces</SelectItem>
                    <SelectItem value="warning">Ostrzeżenie</SelectItem>
                    <SelectItem value="error">Błąd</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={formData.target_users}
                  onValueChange={(value) => setFormData({ ...formData, target_users: value as SystemNotification['target_users'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
                    <SelectItem value="admins">Tylko administratorzy</SelectItem>
                    <SelectItem value="users">Tylko użytkownicy</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Data wygaśnięcia (opcjonalnie)</label>
                <Input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Akcja URL (opcjonalnie)</label>
                  <Input
                    placeholder="/dashboard"
                    value={formData.action_url}
                    onChange={(e) => setFormData({ ...formData, action_url: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Etykieta akcji (opcjonalnie)</label>
                  <Input
                    placeholder="Przejdź"
                    value={formData.action_label}
                    onChange={(e) => setFormData({ ...formData, action_label: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  Utwórz powiadomienie
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
        {notifications.map((notification) => (
          <Card key={notification.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getNotificationIcon(notification.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-lg">{notification.title}</CardTitle>
                      <Badge variant={getTypeBadgeVariant(notification.type)}>
                        {notification.type}
                      </Badge>
                      <Badge variant="outline">
                        {notification.target_users === 'all' ? 'Wszyscy' :
                         notification.target_users === 'admins' ? 'Admini' : 'Użytkownicy'}
                      </Badge>
                    </div>
                    <CardDescription className="whitespace-pre-wrap">
                      {notification.message}
                    </CardDescription>
                    {notification.action_label && notification.action_url && (
                      <Button variant="link" className="px-0 mt-2">
                        {notification.action_label} →
                      </Button>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(notification.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Utworzono: {format(new Date(notification.created_at), 'dd.MM.yyyy HH:mm')}</span>
                {notification.expires_at && (
                  <span>Wygasa: {format(new Date(notification.expires_at), 'dd.MM.yyyy HH:mm')}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {notifications.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Brak powiadomień</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};