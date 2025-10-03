import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Sprawdzanie statusu płatności...');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const orderId = searchParams.get('orderId');
      const error = searchParams.get('error');

      if (error) {
        setStatus('error');
        setMessage('Płatność została anulowana lub wystąpił błąd.');
        return;
      }

      if (!orderId) {
        setStatus('error');
        setMessage('Brak identyfikatora zamówienia.');
        return;
      }

      try {
        // Check order status in database
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('status, order_number')
          .eq('id', orderId)
          .single();

        if (orderError) {
          throw orderError;
        }

        if (order) {
          // For PayU, we consider the order successful if it was created
          // The actual payment status will be updated via webhook
          setStatus('success');
          setMessage(`Zamówienie ${order.order_number} zostało złożone. Status płatności zostanie zaktualizowany po potwierdzeniu przez PayU.`);
        } else {
          setStatus('error');
          setMessage('Nie znaleziono zamówienia.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('error');
        setMessage('Wystąpił błąd podczas sprawdzania statusu płatności.');
      }
    };

    checkPaymentStatus();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Sprawdzanie płatności
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                Sukces
              </>
            )}
            {status === 'error' && (
              <>
                <XCircle className="h-6 w-6 text-red-500" />
                Błąd
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">{message}</p>
          
          <div className="flex gap-2">
            <Button
              onClick={() => navigate('/dashboard?tab=orders')}
              className="flex-1"
              variant={status === 'success' ? 'default' : 'outline'}
            >
              Moje zamówienia
            </Button>
            <Button
              onClick={() => navigate('/')}
              className="flex-1"
              variant="outline"
            >
              Strona główna
            </Button>
          </div>

          {status === 'success' && (
            <p className="text-xs text-center text-muted-foreground">
              Status płatności możesz sprawdzić w sekcji "Moje zamówienia"
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentStatus;
