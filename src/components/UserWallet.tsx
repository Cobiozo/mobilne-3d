import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, History, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

interface UserWalletProps {
  userId: string;
}

export const UserWallet = ({ userId }: UserWalletProps) => {
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, transactions: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (walletError) {
        // Create wallet if doesn't exist
        if (walletError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_wallets')
            .insert({ user_id: userId, balance: 100.00 });
          
          if (insertError) throw insertError;
          setWallet({ balance: 100.00, transactions: [] });
        } else {
          throw walletError;
        }
      } else {
        // Fetch transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactionsError) throw transactionsError;

        setWallet({
          balance: walletData?.balance || 0,
          transactions: transactionsData || []
        });
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
      toast.error('Nie udało się załadować portfela');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [userId]);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            <CardTitle>Portfel</CardTitle>
          </div>
          <Dialog open={showHistory} onOpenChange={setShowHistory}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="w-4 h-4 mr-1" />
                Historia
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Historia transakcji</DialogTitle>
                <DialogDescription>
                  Ostatnie 10 transakcji w Twoim portfelu
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                {wallet.transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Brak transakcji
                  </p>
                ) : (
                  wallet.transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {transaction.amount > 0 ? (
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleString('pl-PL')}
                          </p>
                        </div>
                      </div>
                      <div className={transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                        {transaction.amount > 0 ? '+' : ''}
                        {formatAmount(transaction.amount)} monet
                      </div>
                    </div>
                  ))
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>Twoje saldo wirtualnej waluty</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="text-3xl font-bold">
              {formatAmount(wallet.balance)}
            </div>
            <div className="text-sm text-muted-foreground">monet</div>
          </div>
          <Badge variant="secondary" className="text-lg">
            <Coins className="w-4 h-4 mr-1" />
            {Math.floor(wallet.balance)}
          </Badge>
        </div>
        {wallet.transactions.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Ostatnia transakcja:</p>
            <div className="flex items-center justify-between text-sm">
              <span>{wallet.transactions[0].description}</span>
              <span className={wallet.transactions[0].amount > 0 ? 'text-green-600' : 'text-red-600'}>
                {wallet.transactions[0].amount > 0 ? '+' : ''}
                {formatAmount(wallet.transactions[0].amount)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
