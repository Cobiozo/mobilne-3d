import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Users, Activity, Eye, TrendingUp, Clock, Globe } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAnalytics } from '@/hooks/useAnalytics';

export const SiteAnalytics = () => {
  const { language } = useApp();
  const [timeRange, setTimeRange] = useState('7d');
  const { data: stats, isLoading } = useAnalytics(timeRange);

  if (isLoading) {
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
