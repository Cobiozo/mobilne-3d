-- Add virtual currency column to user_wallets
ALTER TABLE public.user_wallets ADD COLUMN virtual_currency DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Create model_ratings table
CREATE TABLE public.model_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(model_id, user_id)
);

-- Create coin_transactions table for tracking coin exchanges
CREATE TABLE public.coin_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  coins_spent INTEGER NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'coins_to_currency',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for model_ratings
CREATE POLICY "Anyone can view ratings"
  ON public.model_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own ratings"
  ON public.model_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.model_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.model_ratings FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all ratings"
  ON public.model_ratings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for coin_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.coin_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
  ON public.coin_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.coin_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on model_ratings
CREATE TRIGGER update_model_ratings_updated_at
  BEFORE UPDATE ON public.model_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_model_ratings_model_id ON public.model_ratings(model_id);
CREATE INDEX idx_model_ratings_user_id ON public.model_ratings(user_id);
CREATE INDEX idx_coin_transactions_user_id ON public.coin_transactions(user_id);
CREATE INDEX idx_coin_transactions_created_at ON public.coin_transactions(created_at DESC);

-- Function to exchange coins for virtual currency
CREATE OR REPLACE FUNCTION public.exchange_coins_to_currency(p_coins INTEGER)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_current_balance DECIMAL;
  v_currency_amount DECIMAL;
  v_wallet_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  
  IF p_coins <= 0 OR p_coins % 100 != 0 THEN
    RAISE EXCEPTION 'Coins must be a positive multiple of 100';
  END IF;
  
  -- Calculate currency amount (100 coins = 1 PLN)
  v_currency_amount := p_coins / 100.0;
  
  -- Get current balance
  SELECT balance, id INTO v_current_balance, v_wallet_id
  FROM public.user_wallets
  WHERE user_id = v_user_id;
  
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  
  IF v_current_balance < p_coins THEN
    RAISE EXCEPTION 'Insufficient coins. Available: %, Required: %', v_current_balance, p_coins;
  END IF;
  
  -- Deduct coins and add virtual currency
  UPDATE public.user_wallets
  SET 
    balance = balance - p_coins,
    virtual_currency = virtual_currency + v_currency_amount,
    updated_at = now()
  WHERE user_id = v_user_id;
  
  -- Log transaction
  INSERT INTO public.coin_transactions (user_id, amount, coins_spent, transaction_type)
  VALUES (v_user_id, v_currency_amount, p_coins, 'coins_to_currency');
  
  RETURN jsonb_build_object(
    'success', true,
    'coins_spent', p_coins,
    'currency_received', v_currency_amount,
    'new_balance', v_current_balance - p_coins,
    'new_virtual_currency', (SELECT virtual_currency FROM public.user_wallets WHERE user_id = v_user_id)
  );
END;
$$;