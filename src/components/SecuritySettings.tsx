import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { Shield, AlertTriangle, Info, AlertCircle, RefreshCw } from 'lucide-react';
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

export const SecuritySettings = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    fetchLogs();
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

  const resourceTypes = [...new Set(logs.map(log => log.resource_type))];

  if (isLoading) {
    return <div className="flex items-center justify-center py-12">Ładowanie...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bezpieczeństwo i logi audytu</h2>
          <p className="text-muted-foreground">
            Monitoruj działania użytkowników i zdarzenia systemowe
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Odśwież
        </Button>
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
            Historia działań użytkowników i zdarzeń systemowych
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
    </div>
  );
};