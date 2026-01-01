import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Users, Activity, Eye, TrendingUp, Clock, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AnalyticsStats {
  totalVisits: number;
  uniqueUsers: number;
  onlineUsers: number;
  avgSessionDuration: number;
  topPages: { page: string; visits: number }[];
  visitsOverTime: { date: string; count: number }[];
}

export const SiteAnalytics = () => {
  const { language } = useApp();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [timeRange, setTimeRange] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const now = new Date();
      const rangeMap: Record<string, number> = {
        '24h': 1,
        '7d': 7,
        '30d': 30,
        '90d': 90,
      };
      const daysAgo = rangeMap[timeRange] || 7;
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      // Fetch total visits
      const { count: totalVisits } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Fetch unique users
      const { data: uniqueUsersData } = await supabase
        .from('analytics_events')
        .select('session_id')
        .gte('created_at', startDate.toISOString());

      const uniqueUsers = new Set(uniqueUsersData?.map(e => e.session_id)).size;

      // Fetch online users (active in last 5 minutes)
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const { count: onlineUsers } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('last_activity', fiveMinutesAgo.toISOString());

      // Fetch events for page analysis
      const { data: events } = await supabase
        .from('analytics_events')
        .select('event_name, event_data, created_at, session_id')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Calculate top pages
      const pageVisits: Record<string, number> = {};
      events?.forEach(event => {
        const eventData = event.event_data as { page?: string } | null;
        const page = eventData?.page || event.event_name;
        pageVisits[page] = (pageVisits[page] || 0) + 1;
      });

      const topPages = Object.entries(pageVisits)
        .map(([page, visits]) => ({ page, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      // Calculate visits over time
      const visitsByDate: Record<string, number> = {};
      events?.forEach(event => {
        const date = new Date(event.created_at).toLocaleDateString();
        visitsByDate[date] = (visitsByDate[date] || 0) + 1;
      });

      const visitsOverTime = Object.entries(visitsByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate average session duration
      const sessionDurations: Record<string, { start: Date; end: Date }> = {};
      events?.forEach(event => {
        const sessionId = event.session_id;
        const timestamp = new Date(event.created_at);
        
        if (!sessionDurations[sessionId]) {
          sessionDurations[sessionId] = { start: timestamp, end: timestamp };
        } else {
          if (timestamp < sessionDurations[sessionId].start) {
            sessionDurations[sessionId].start = timestamp;
          }
          if (timestamp > sessionDurations[sessionId].end) {
            sessionDurations[sessionId].end = timestamp;
          }
        }
      });

      const durations = Object.values(sessionDurations).map(
        ({ start, end }) => (end.getTime() - start.getTime()) / 1000 / 60
      );
      const avgSessionDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

      setStats({
        totalVisits: totalVisits || 0,
        uniqueUsers,
        onlineUsers: onlineUsers || 0,
        avgSessionDuration,
        topPages,
        visitsOverTime,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {getText('siteAnalytics', language)}
          </h2>
          <p className="text-muted-foreground">
            {getText('analyticsDescription', language)}
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Ostatnie 24h</SelectItem>
            <SelectItem value="7d">Ostatnie 7 dni</SelectItem>
            <SelectItem value="30d">Ostatnie 30 dni</SelectItem>
            <SelectItem value="90d">Ostatnie 90 dni</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszystkie wizyty</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVisits || 0}</div>
            <p className="text-xs text-muted-foreground">
              w ostatnim okresie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unikalni użytkownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              unikalnych sesji
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Użytkownicy online</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.onlineUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              aktywni teraz
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Śr. czas sesji</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgSessionDuration.toFixed(1) || 0} min
            </div>
            <p className="text-xs text-muted-foreground">
              średni czas wizyty
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pages" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pages">
            <Globe className="mr-2 h-4 w-4" />
            Najpopularniejsze strony
          </TabsTrigger>
          <TabsTrigger value="traffic">
            <TrendingUp className="mr-2 h-4 w-4" />
            Ruch w czasie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 odwiedzanych stron</CardTitle>
              <CardDescription>
                Najpopularniejsze strony w wybranym okresie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.topPages && stats.topPages.length > 0 ? (
                  stats.topPages.map((page, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{page.page}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(page.visits / (stats.topPages[0]?.visits || 1)) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-16 text-right text-sm font-medium">
                          {page.visits}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    Brak danych do wyświetlenia
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ruch w czasie</CardTitle>
              <CardDescription>
                Liczba wizyt w poszczególnych dniach
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.visitsOverTime && stats.visitsOverTime.length > 0 ? (
                  stats.visitsOverTime.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.date}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-48 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full bg-primary"
                            style={{
                              width: `${(item.count / Math.max(...stats.visitsOverTime.map(v => v.count))) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="w-12 text-right text-sm">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground">
                    Brak danych do wyświetlenia
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
