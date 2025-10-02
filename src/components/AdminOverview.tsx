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

interface AdminOverviewProps {
  onTabChange?: (tab: string) => void;
}

export const AdminOverview = ({ onTabChange }: AdminOverviewProps) => {
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
        .select('id, total_price, created_at, user_id');

      // Fetch models count
      const { data: modelsData, error: modelsError } = await supabase
        .from('models')
        .select('id, created_at, user_id');

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

      // Fetch recent activity from actual data
      const recentActivity: ActivityItem[] = [];

      // Get recent users
      const recentUsers = usersData
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3) || [];
      
      for (const user of recentUsers) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.user_id)
          .single();
        
        recentActivity.push({
          id: user.user_id,
          type: 'user_registered',
          description: 'Nowy użytkownik zarejestrował się',
          timestamp: user.created_at,
          user_name: profile?.display_name || 'Nieznany użytkownik'
        });
      }

      // Get recent orders
      const recentOrders = ordersData
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3) || [];
      
      for (const order of recentOrders) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', order.user_id)
          .single();
        
        recentActivity.push({
          id: order.id,
          type: 'order_created',
          description: 'Nowe zamówienie zostało złożone',
          timestamp: order.created_at,
          user_name: profile?.display_name || 'Nieznany użytkownik'
        });
      }

      // Get recent models
      const recentModels = modelsData
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3) || [];
      
      for (const model of recentModels) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', model.user_id)
          .single();
        
        recentActivity.push({
          id: model.id,
          type: 'model_uploaded',
          description: 'Nowy model 3D został wgrany',
          timestamp: model.created_at,
          user_name: profile?.display_name || 'Nieznany użytkownik'
        });
      }

      // Sort all activities by timestamp and take the 5 most recent
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const limitedActivity = recentActivity.slice(0, 5);

      setStats({
        totalUsers,
        totalOrders,
        totalModels,
        totalRevenue,
        recentActivity: limitedActivity,
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
        <h2 className="text-2xl font-bold">{getText('adminOverview', language)}</h2>
        <p className="text-muted-foreground">
          {getText('overviewDescription', language)}
        </p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => onTabChange?.('customers')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getText('allUsers', language)}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyStats.newUsers} {getText('thisMonth', language)}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => onTabChange?.('orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getText('orders', language)}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyStats.newOrders} {getText('thisMonth', language)}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => onTabChange?.('models')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getText('myModels', language)}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalModels}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.monthlyStats.newModels} {getText('thisMonth', language)}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
          onClick={() => onTabChange?.('orders')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{getText('revenue', language)}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} zł</div>
            <p className="text-xs text-muted-foreground">
              {getText('totalRevenue', language)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {getText('recentActivity', language)}
            </CardTitle>
            <CardDescription>
              {getText('latestEvents', language)}
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
              {getText('monthlyStats', language)}
            </CardTitle>
            <CardDescription>
              {getText('currentMonthSummary', language)}
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