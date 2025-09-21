import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { getText } from '@/lib/i18n';
import { BarChart3, Users, ShoppingCart, FileText, TrendingUp, Activity } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalModels: number;
  totalRevenue: number;
  recentActivity: ActivityItem[];
  monthlyStats: {
    newUsers: number;
    newOrders: number;
    newModels: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'user_registered' | 'order_created' | 'model_uploaded';
  description: string;
  timestamp: string;
  user_name: string;
}

export const AdminOverview = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { language } = useApp();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      // Fetch users count
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, created_at');

      // Fetch orders count and revenue
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_price, created_at');

      // Fetch models count
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('id, created_at');

      if (usersError || ordersError || modelsError) {
        throw new Error('Failed to fetch dashboard data');
      }

      const totalUsers = usersData?.length || 0;
      const totalOrders = ordersData?.length || 0;
      const totalModels = modelsData?.length || 0;
      const totalRevenue = ordersData?.reduce((sum, order) => sum + (parseFloat(order.total_price?.toString() || '0') || 0), 0) || 0;

      // Calculate monthly stats
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const newUsers = usersData?.filter(user => {
        const date = new Date(user.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length || 0;

      const newOrders = ordersData?.filter(order => {
        const date = new Date(order.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length || 0;

      const newModels = modelsData?.filter(model => {
        const date = new Date(model.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }).length || 0;

      // Mock recent activity (in a real app, you'd fetch from analytics_events table)
      const recentActivity: ActivityItem[] = [
        {
          id: '1',
          type: 'user_registered',
          description: 'Nowy użytkownik zarejestrował się',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          user_name: 'Jan Kowalski'
        },
        {
          id: '2',
          type: 'order_created',
          description: 'Nowe zamówienie zostało złożone',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          user_name: 'Anna Nowak'
        },
        {
          id: '3',
          type: 'model_uploaded',
          description: 'Nowy model 3D został wgrany',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
          user_name: 'Piotr Wiśniewski'
        }
      ];

      setStats({
        totalUsers,
        totalOrders,
        totalModels,
        totalRevenue,
        recentActivity,
        monthlyStats: {
          newUsers,
          newOrders,
          newModels
        }
      });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast({
        title: getText('error', language),
        description: 'Failed to load dashboard statistics',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'user_registered':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'order_created':
        return <ShoppingCart className="w-4 h-4 text-green-500" />;
      case 'model_uploaded':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes} min temu`;
    } else if (diffInMinutes < 24 * 60) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} godz. temu`;
    } else {
      const days = Math.floor(diffInMinutes / (24 * 60));
      return `${days} dni temu`;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Nie udało się załadować statystyk</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Przegląd administratora</h2>
        <p className="text-muted-foreground">
          Główne statystyki i aktywność na platformie
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wszyscy użytkownicy</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyStats.newUsers} w tym miesiącu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zamówienia</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyStats.newOrders} w tym miesiącu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Modele 3D</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModels}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyStats.newModels} w tym miesiącu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Przychód</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} zł</div>
            <p className="text-xs text-muted-foreground">
              Łączny przychód ze wszystkich zamówień
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Ostatnia aktywność
            </CardTitle>
            <CardDescription>
              Najnowsze wydarzenia na platformie
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user_name} • {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Statystyki miesięczne
            </CardTitle>
            <CardDescription>
              Podsumowanie aktywności w bieżącym miesiącu
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Nowi użytkownicy</span>
                <Badge variant="secondary">{stats.monthlyStats.newUsers}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Nowe zamówienia</span>
                <Badge variant="secondary">{stats.monthlyStats.newOrders}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Nowe modele</span>
                <Badge variant="secondary">{stats.monthlyStats.newModels}</Badge>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Współczynnik konwersji</span>
                  <Badge variant="default">
                    {stats.totalUsers > 0 ? 
                      ((stats.totalOrders / stats.totalUsers) * 100).toFixed(1) + '%' : 
                      '0%'
                    }
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};