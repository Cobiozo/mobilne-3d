import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, History, TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  virtual_currency: number;
  transactions: Transaction[];
  coin_transactions: CoinTransaction[];
}

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
  related_order_id: string | null;
  order?: {
    order_number: string;
  };
}

interface CoinTransaction {
  id: string;
  amount: number;
  coins_spent: number;
  transaction_type: string;
  created_at: string;
}

interface UserWalletProps {
  userId: string;
}

export const UserWallet = ({ userId }: UserWalletProps) => {
  const [wallet, setWallet] = useState<WalletData>({ 
    balance: 0, 
    virtual_currency: 0,
    transactions: [],
    coin_transactions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [coinsToExchange, setCoinsToExchange] = useState<string>('100');
  const [isExchanging, setIsExchanging] = useState(false);

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      // Fetch wallet balance
      const { data: walletData, error: walletError } = await supabase
        .from('user_wallets')
        .select('balance, virtual_currency')
        .eq('user_id', userId)
        .single();

      if (walletError) {
        // Create wallet if doesn't exist
        if (walletError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('user_wallets')
            .insert({ user_id: userId, balance: 0.00, virtual_currency: 0.00 });
          
          if (insertError) throw insertError;
          setWallet({ balance: 0.00, virtual_currency: 0.00, transactions: [], coin_transactions: [] });
        } else {
          throw walletError;
        }
      } else {
        // Fetch wallet transactions
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactionsError) throw transactionsError;

        // Fetch order details for transactions with related orders
        const transactionsWithOrders = await Promise.all(
          (transactionsData || []).map(async (tx) => {
            if (tx.related_order_id) {
              const { data: orderData } = await supabase
                .from('orders')
                .select('order_number')
                .eq('id', tx.related_order_id)
                .single();
              
              return { ...tx, order: orderData };
            }
            return tx;
          })
        );

        // Fetch coin transactions
        const { data: coinTransactionsData, error: coinTransactionsError } = await supabase
          .from('coin_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (coinTransactionsError) throw coinTransactionsError;

        setWallet({
          balance: walletData?.balance || 0,
          virtual_currency: walletData?.virtual_currency || 0,
          transactions: transactionsWithOrders || [],
          coin_transactions: coinTransactionsData || []
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

  const handleExchangeCoins = async () => {
    const coins = parseInt(coinsToExchange);
    
    if (isNaN(coins) || coins <= 0) {
      toast.error('Wprowadź prawidłową liczbę monet');
      return;
    }

    if (coins % 100 !== 0) {
      toast.error('Liczba monet musi być wielokrotnością 100');
      return;
    }

    if (coins > wallet.balance) {
      toast.error('Niewystarczająca liczba monet');
      return;
    }

    setIsExchanging(true);
    try {
      const { data, error } = await supabase.rpc('exchange_coins_to_currency', {
        p_coins: coins
      });

      if (error) throw error;

      toast.success(`Wymieniono ${coins} monet na ${(coins / 100).toFixed(2)} PLN!`);
      setShowExchangeDialog(false);
      setCoinsToExchange('100');
      await fetchWallet();
    } catch (error: any) {
      console.error('Error exchanging coins:', error);
      toast.error(error.message || 'Nie udało się wymienić monet');
    } finally {
      setIsExchanging(false);
    }
  };

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
                          {transaction.related_order_id && transaction.order && (
                            <p className="text-xs text-primary font-medium">
                              Zamówienie: {transaction.order.order_number}
                            </p>
                          )}
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
        <div className="space-y-4">
          {/* Monety (coins) */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <span className="font-medium">Monety</span>
              </div>
              <div className="text-2xl font-bold">
                {formatAmount(wallet.balance)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Zarabiaj monety za zakupy i aktywność
            </p>
          </div>

          {/* Wirtualna waluta */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-primary" />
                <span className="font-medium">Wirtualna waluta</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {formatAmount(wallet.virtual_currency)} PLN
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Użyj przy składaniu zamówień
            </p>
            
            {wallet.balance > 0 && (
              <Dialog open={showExchangeDialog} onOpenChange={setShowExchangeDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <ArrowRightLeft className="w-4 h-4 mr-2" />
                    Wymień monety na PLN
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Wymiana monet</DialogTitle>
                    <DialogDescription>
                      100 monet = 1 PLN. Minimalna wymiana: 100 monet
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Liczba monet do wymiany</Label>
                      <Input
                        type="number"
                        min="100"
                        step="100"
                        value={coinsToExchange}
                        onChange={(e) => setCoinsToExchange(e.target.value)}
                        placeholder="100"
                      />
                      <p className="text-sm text-muted-foreground">
                        Otrzymasz: {(parseInt(coinsToExchange) / 100 || 0).toFixed(2)} PLN
                      </p>
                    </div>

                    <div className="p-3 bg-muted rounded-lg space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Dostępne monety:</span>
                        <span className="font-medium">{formatAmount(wallet.balance)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Aktualna waluta:</span>
                        <span className="font-medium">{formatAmount(wallet.virtual_currency)} PLN</span>
                      </div>
                    </div>

                    <Button 
                      onClick={handleExchangeCoins} 
                      disabled={isExchanging}
                      className="w-full"
                    >
                      {isExchanging ? (
                        <>
                          <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          Wymieniam...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Wymień monety
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        {(wallet.transactions.length > 0 || wallet.coin_transactions.length > 0) && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <p className="text-xs text-muted-foreground mb-2">Ostatnie transakcje:</p>
            {wallet.coin_transactions.slice(0, 2).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                <span className="flex items-center gap-2">
                  <ArrowRightLeft className="w-3 h-3" />
                  Wymiana monet
                </span>
                <span className="text-primary font-medium">
                  +{formatAmount(tx.amount)} PLN
                </span>
              </div>
            ))}
            {wallet.transactions.slice(0, 1).map((tx) => (
              <div key={tx.id} className="flex flex-col text-sm p-2 bg-muted/50 rounded">
                <div className="flex items-center justify-between">
                  <span>{tx.description}</span>
                  <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                    {tx.amount > 0 ? '+' : ''}
                    {formatAmount(tx.amount)}
                  </span>
                </div>
                {tx.related_order_id && tx.order && (
                  <span className="text-xs text-primary font-medium mt-1">
                    Zamówienie: {tx.order.order_number}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
