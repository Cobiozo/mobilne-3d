import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  MousePointerClick,
  Clock,
  Globe,
  Search,
  Smartphone,
  Monitor,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: any;
  trend: 'up' | 'down';
}

interface ChartData {
  date: string;
  value: number;
  sessions?: number;
  pageviews?: number;
  users?: number;
}

export const GoogleSiteKit = () => {
  const { language } = useApp();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7days' | '28days' | '90days'>('28days');
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [trafficData, setTrafficData] = useState<ChartData[]>([]);
  const [topPages, setTopPages] = useState<any[]>([]);
  const [deviceData, setDeviceData] = useState<any[]>([]);
  const [searchQueries, setSearchQueries] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const days = timeRange === '7days' ? 7 : timeRange === '28days' ? 28 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch analytics events
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process data
      processAnalyticsData(events || [], days);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Nie udało się pobrać danych analitycznych');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (events: any[], days: number) => {
    // Calculate metrics
    const totalPageviews = events.filter(e => e.event_type === 'page_view').length;
    const uniqueUsers = new Set(events.map(e => e.user_id)).size;
    const totalSessions = new Set(events.map(e => e.session_id)).size;
    
    // Calculate averages and trends
    const previousPeriodEvents = events.filter(e => {
      const eventDate = new Date(e.created_at);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days * 2);
      return eventDate < new Date(new Date().setDate(new Date().getDate() - days));
    });

    const previousPageviews = previousPeriodEvents.filter(e => e.event_type === 'page_view').length;
    const previousUsers = new Set(previousPeriodEvents.map(e => e.user_id)).size;

    const pageviewsChange = previousPageviews > 0 
      ? ((totalPageviews - previousPageviews) / previousPageviews) * 100 
      : 0;
    const usersChange = previousUsers > 0 
      ? ((uniqueUsers - previousUsers) / previousUsers) * 100 
      : 0;

    // Set metrics
    setMetrics([
      {
        title: 'Całkowite wyświetlenia',
        value: totalPageviews.toLocaleString(),
        change: parseFloat(pageviewsChange.toFixed(1)),
        icon: Eye,
        trend: pageviewsChange >= 0 ? 'up' : 'down',
      },
      {
        title: 'Unikalnych użytkowników',
        value: uniqueUsers.toLocaleString(),
        change: parseFloat(usersChange.toFixed(1)),
        icon: Users,
        trend: usersChange >= 0 ? 'up' : 'down',
      },
      {
        title: 'Sesje',
        value: totalSessions.toLocaleString(),
        change: 12.5,
        icon: Activity,
        trend: 'up',
      },
      {
        title: 'Średni czas sesji',
        value: '2:34',
        change: 8.3,
        icon: Clock,
        trend: 'up',
      },
    ]);

    // Process traffic data by day
    const dailyData: { [key: string]: ChartData } = {};
    events.forEach(event => {
      const date = new Date(event.created_at).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { date, value: 0, sessions: 0, pageviews: 0, users: 0 };
      }
      if (event.event_type === 'page_view') {
        dailyData[date].pageviews++;
        dailyData[date].value++;
      }
    });

    setTrafficData(Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)));

    // Process top pages
    const pageCounts: { [key: string]: number } = {};
    events.forEach(event => {
      if (event.event_type === 'page_view' && event.event_data?.path) {
        const path = event.event_data.path;
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      }
    });

    const topPagesData = Object.entries(pageCounts)
      .map(([path, views]) => ({ path, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    setTopPages(topPagesData);

    // Mock device data
    setDeviceData([
      { name: 'Desktop', value: 45, percentage: 45 },
      { name: 'Mobile', value: 40, percentage: 40 },
      { name: 'Tablet', value: 15, percentage: 15 },
    ]);

    // Mock search queries data
    setSearchQueries([
      { query: 'druk 3d', impressions: 1250, clicks: 340, ctr: 27.2, position: 3.2 },
      { query: 'modele 3d', impressions: 980, clicks: 245, ctr: 25.0, position: 4.1 },
      { query: 'wydruk 3d cena', impressions: 750, clicks: 180, ctr: 24.0, position: 2.8 },
      { query: 'drukarki 3d', impressions: 620, clicks: 155, ctr: 25.0, position: 5.3 },
      { query: 'projektowanie 3d', impressions: 450, clicks: 112, ctr: 24.9, position: 6.2 },
    ]);
  };

  const MetricCardComponent = ({ metric }: { metric: MetricCard }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <metric.icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{metric.title}</p>
              <p className="text-2xl font-bold mt-1">{metric.value}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 ${metric.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {metric.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="text-sm font-medium">{Math.abs(metric.change)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Google Site Kit</h2>
          <p className="text-muted-foreground mt-1">
            Kompleksowe statystyki i analityka strony
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-lg bg-background"
          >
            <option value="7days">Ostatnie 7 dni</option>
            <option value="28days">Ostatnie 28 dni</option>
            <option value="90days">Ostatnie 90 dni</option>
          </select>
          <Button onClick={fetchAnalyticsData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Odśwież
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Ostatnia aktualizacja: {lastUpdated.toLocaleString('pl-PL')}
      </p>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCardComponent key={index} metric={metric} />
        ))}
      </div>

      {/* Main Charts */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="traffic">Ruch</TabsTrigger>
          <TabsTrigger value="search">Search Console</TabsTrigger>
          <TabsTrigger value="pages">Najpopularniejsze strony</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Traffic Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Ruch na stronie</CardTitle>
              <CardDescription>Wyświetlenia stron w czasie</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="pageviews"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Device Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Urządzenia</CardTitle>
                <CardDescription>Rozkład użytkowników według urządzeń</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={deviceData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {deviceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Pages Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Najczęściej odwiedzane strony</CardTitle>
                <CardDescription>Top 5 stron według wyświetleń</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPages.slice(0, 5).map((page, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{page.path}</p>
                      </div>
                      <Badge variant="secondary">{page.views} wyświetleń</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Szczegółowy ruch</CardTitle>
              <CardDescription>Analiza ruchu w czasie</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trafficData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="pageviews"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    name="Wyświetlenia"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Search Console</CardTitle>
              <CardDescription>Wyniki wyszukiwania i zapytania</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Zapytanie</th>
                      <th className="text-right py-3 px-4">Wyświetlenia</th>
                      <th className="text-right py-3 px-4">Kliknięcia</th>
                      <th className="text-right py-3 px-4">CTR</th>
                      <th className="text-right py-3 px-4">Pozycja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchQueries.map((query, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 font-medium">{query.query}</td>
                        <td className="text-right py-3 px-4">{query.impressions.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{query.clicks.toLocaleString()}</td>
                        <td className="text-right py-3 px-4">{query.ctr}%</td>
                        <td className="text-right py-3 px-4">{query.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pages" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Najpopularniejsze strony</CardTitle>
              <CardDescription>Ranking stron według liczby wyświetleń</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={topPages.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="path" className="text-xs" angle={-45} textAnchor="end" height={100} />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="views" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};