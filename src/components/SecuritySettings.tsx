import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Shield, AlertTriangle, Info, AlertCircle, RefreshCw, Download, Trash2, Users, Ban, Bell } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

interface ActiveSession {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  last_seen: string;
  ip_address: string;
  user_agent: string;
}

export const SecuritySettings = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const [daysToKeep, setDaysToKeep] = useState<number>(30);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    fetchLogs();
    fetchActiveSessions();
  }, [severityFilter, resourceFilter]);

  const fetchLogs = async () => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (resourceFilter !== 'all') {
        query = query.eq('resource_type', resourceFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: getText('error', language),
        description: 'Nie udało się pobrać logów bezpieczeństwa',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  const fetchActiveSessions = async () => {
    try {
      // Fetch recent analytics events to show active sessions
      const { data, error } = await supabase
        .from('analytics_events')
        .select('user_id, ip_address, user_agent, created_at')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get unique users with their latest activity
      const sessionsMap = new Map<string, ActiveSession>();
      
      for (const event of data || []) {
        if (!sessionsMap.has(event.user_id)) {
          // Fetch user email
          const { data: { user } } = await supabase.auth.admin.getUserById(event.user_id);
          
          sessionsMap.set(event.user_id, {
            id: event.user_id,
            user_id: event.user_id,
            email: user?.email || 'Unknown',
            created_at: event.created_at,
            last_seen: event.created_at,
            ip_address: (event.ip_address as string) || 'Unknown',
            user_agent: (event.user_agent as string) || 'Unknown'
          });
        }
      }

      setActiveSessions(Array.from(sessionsMap.values()));
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const exportLogsToCSV = () => {
    const headers = ['Data', 'Poziom', 'Akcja', 'Zasób', 'User ID', 'IP', 'User Agent'];
    const csvContent = [
      headers.join(','),
      ...logs.map(log => [
        format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss'),
        log.severity,
        log.action,
        log.resource_type,
        log.user_id || '',
        log.ip_address || '',
        `"${log.user_agent?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `security_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();

    toast({
      title: 'Sukces',
      description: 'Logi zostały wyeksportowane do pliku CSV',
    });
  };

  const clearOldLogs = async () => {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - daysToKeep);

      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', dateThreshold.toISOString());

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: `Usunięto logi starsze niż ${daysToKeep} dni`,
      });

      fetchLogs();
    } catch (error) {
      console.error('Error clearing logs:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się usunąć starych logów',
        variant: 'destructive',
      });
    }
  };

  const terminateUserSession = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.signOut(userId);

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: 'Sesja użytkownika została zakończona',
      });

      fetchActiveSessions();
    } catch (error) {
      console.error('Error terminating session:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zakończyć sesji użytkownika',
        variant: 'destructive',
      });
    }
  };

  const resourceTypes = [...new Set(logs.map(log => log.resource_type))];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Centrum Bezpieczeństwa</h2>
          <p className="text-muted-foreground">
            Zarządzaj bezpieczeństwem, sesjami i logami systemu
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportLogsToCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Eksportuj logi
          </Button>
          <Button onClick={() => { fetchLogs(); fetchActiveSessions(); }} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie logi</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">Ostatnie 100 zdarzeń</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ostrzeżenia</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(log => log.severity === 'warning').length}
            </div>
            <p className="text-xs text-muted-foreground">Wymaga uwagi</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Krytyczne</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.filter(log => log.severity === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">Wymaga natychmiastowej akcji</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">
            <Shield className="w-4 h-4 mr-2" />
            Logi audytu
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <Users className="w-4 h-4 mr-2" />
            Aktywne sesje
          </TabsTrigger>
          <TabsTrigger value="maintenance">
            <Trash2 className="w-4 h-4 mr-2" />
            Konserwacja
          </TabsTrigger>
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtruj po wadze" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie</SelectItem>
                <SelectItem value="info">Informacje</SelectItem>
                <SelectItem value="warning">Ostrzeżenia</SelectItem>
                <SelectItem value="critical">Krytyczne</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtruj po zasobie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie zasoby</SelectItem>
                {resourceTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          <Card>
            <CardHeader>
              <CardTitle>Dziennik zdarzeń</CardTitle>
              <CardDescription>
                Historia działań użytkowników i zdarzeń systemowych (ostatnie 100)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {getSeverityIcon(log.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={getSeverityBadgeVariant(log.severity)}>
                          {log.severity}
                        </Badge>
                        <Badge variant="outline">
                          {log.resource_type}
                        </Badge>
                        <span className="text-sm font-medium">{log.action}</span>
                      </div>
                      
                      {log.details && (
                        <div className="text-sm text-muted-foreground mb-2">
                          <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss')}</span>
                        {log.user_id && <span>User ID: {log.user_id.slice(0, 8)}...</span>}
                        {log.ip_address && <span>IP: {log.ip_address}</span>}
                      </div>
                      
                      {log.user_agent && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {log.user_agent}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {logs.length === 0 && (
                  <div className="py-12 text-center">
                    <Shield className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Brak logów do wyświetlenia</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Aktywne sesje użytkowników</CardTitle>
              <CardDescription>
                Lista aktywnych sesji w systemie z możliwością ich zakończenia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Users className="w-5 h-5 text-blue-500 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">{session.email}</span>
                        <Badge variant="outline">Aktywna</Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Ostatnia aktywność: {format(new Date(session.last_seen), 'dd.MM.yyyy HH:mm:ss')}</span>
                        <span>IP: {session.ip_address}</span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {session.user_agent}
                      </div>
                    </div>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Ban className="w-4 h-4 mr-2" />
                          Zakończ sesję
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Czy na pewno chcesz zakończyć sesję?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Użytkownik {session.email} zostanie wylogowany ze wszystkich urządzeń.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => terminateUserSession(session.user_id)}>
                            Zakończ sesję
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}

                {activeSessions.length === 0 && (
                  <div className="py-12 text-center">
                    <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Brak aktywnych sesji</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Konserwacja systemu</CardTitle>
              <CardDescription>
                Zarządzanie logami i czyszczenie starych danych
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="daysToKeep">Usuń logi starsze niż (dni)</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="daysToKeep"
                      type="number"
                      min="1"
                      value={daysToKeep}
                      onChange={(e) => setDaysToKeep(Number(e.target.value))}
                      className="w-32"
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Usuń stare logi
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Czy na pewno chcesz usunąć stare logi?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Wszystkie logi starsze niż {daysToKeep} dni zostaną trwale usunięte. 
                            Tej operacji nie można cofnąć.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={clearOldLogs}>
                            Usuń logi
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Obecnie przechowywanych jest {logs.length} logów (wyświetlane ostatnie 100)
                  </p>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="text-sm font-medium mb-4">Informacje o systemie</h3>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Całkowita liczba logów:</span>
                      <span className="font-medium">{logs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Logi krytyczne:</span>
                      <span className="font-medium text-red-500">
                        {logs.filter(log => log.severity === 'critical').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ostrzeżenia:</span>
                      <span className="font-medium text-orange-500">
                        {logs.filter(log => log.severity === 'warning').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Aktywne sesje:</span>
                      <span className="font-medium">{activeSessions.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};