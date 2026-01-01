import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export const EmailLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchLogs, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching email logs:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się pobrać logów emaili",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    setIsClearing(true);
    try {
      const { data, error } = await supabase.functions.invoke('clear-email-logs');

      if (error) throw error;

      toast({
        title: "Sukces",
        description: "Historia emaili została wyczyszczona",
      });
      
      setLogs([]);
    } catch (error) {
      console.error("Error clearing email logs:", error);
      toast({
        title: "Błąd",
        description: "Nie udało się wyczyścić historii emaili",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      sent: "default",
      failed: "destructive",
      pending: "secondary",
    };

    const labels: Record<string, string> = {
      sent: "Wysłano",
      failed: "Błąd",
      pending: "Oczekuje",
    };

    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Historia wysłanych emaili</CardTitle>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                disabled={isClearing || logs.length === 0}
              >
                {isClearing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="ml-2">Wyczyść historię</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Czy na pewno?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ta akcja usunie całą historię wysłanych emaili. Nie można jej cofnąć.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearLogs}>
                  Wyczyść historię
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Odbiorca</TableHead>
                <TableHead>Temat</TableHead>
                <TableHead>Szablon</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Wysłano</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {new Date(log.created_at).toLocaleString("pl-PL")}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.recipient_email}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.subject}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {log.template_type || "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    {log.sent_at
                      ? new Date(log.sent_at).toLocaleString("pl-PL")
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {logs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Brak logów emaili
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};