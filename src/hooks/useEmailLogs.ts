import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmailLog {
  id: string;
  recipient_email: string;
  subject: string;
  template_type: string;
  status: string;
  error_message?: string;
  sent_at?: string;
  created_at: string;
}

const fetchEmailLogs = async (): Promise<EmailLog[]> => {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
};

const clearEmailLogs = async (): Promise<void> => {
  const { error } = await supabase.functions.invoke('clear-email-logs');
  if (error) throw error;
};

export const useEmailLogs = () => {
  return useQuery({
    queryKey: ['emailLogs'],
    queryFn: fetchEmailLogs,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
    refetchOnWindowFocus: false, // Prevent refetch on tab focus
    refetchIntervalInBackground: false, // Stop polling when tab is hidden
  });
};

export const useClearEmailLogs = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: clearEmailLogs,
    onSuccess: () => {
      queryClient.setQueryData(['emailLogs'], []);
    },
  });
};
