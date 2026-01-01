import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsStats {
  totalVisits: number;
  uniqueUsers: number;
  onlineUsers: number;
  avgSessionDuration: number;
  topPages: { page: string; visits: number }[];
  visitsOverTime: { date: string; count: number }[];
}

const fetchAnalyticsData = async (timeRange: string): Promise<AnalyticsStats> => {
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
    if (!sessionId) return;
    
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

  return {
    totalVisits: totalVisits || 0,
    uniqueUsers,
    onlineUsers: onlineUsers || 0,
    avgSessionDuration,
    topPages,
    visitsOverTime,
  };
};

export const useAnalytics = (timeRange: string) => {
  return useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => fetchAnalyticsData(timeRange),
    staleTime: 60 * 1000, // 60 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
  });
};
