-- Create user wallet table for virtual currency
CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_wallets
CREATE POLICY "Users can view their own wallet"
  ON public.user_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own wallet"
  ON public.user_wallets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all wallets"
  ON public.user_wallets
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create model orders table (peer-to-peer)
CREATE TABLE IF NOT EXISTS public.model_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT different_users CHECK (buyer_id != seller_id)
);

-- Enable RLS
ALTER TABLE public.model_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for model_orders
CREATE POLICY "Users can view their own orders"
  ON public.model_orders
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create orders"
  ON public.model_orders
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Users can update their own orders"
  ON public.model_orders
  FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE POLICY "Admins can manage all orders"
  ON public.model_orders
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create transaction history table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'purchase', 'sale')),
  description TEXT,
  related_order_id UUID REFERENCES public.model_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.wallet_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all transactions"
  ON public.wallet_transactions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add price field to models table
ALTER TABLE public.models 
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) DEFAULT 0.00;

-- Function to process model purchase
CREATE OR REPLACE FUNCTION public.process_model_purchase(
  p_model_id UUID,
  p_buyer_id UUID,
  p_price DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id UUID;
  v_buyer_balance DECIMAL;
  v_order_id UUID;
BEGIN
  -- Get seller ID
  SELECT user_id INTO v_seller_id
  FROM public.models
  WHERE id = p_model_id;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Model not found';
  END IF;

  IF v_seller_id = p_buyer_id THEN
    RAISE EXCEPTION 'Cannot purchase your own model';
  END IF;

  -- Check buyer balance
  SELECT balance INTO v_buyer_balance
  FROM public.user_wallets
  WHERE user_id = p_buyer_id;

  IF v_buyer_balance IS NULL THEN
    -- Create wallet if doesn't exist
    INSERT INTO public.user_wallets (user_id, balance)
    VALUES (p_buyer_id, 0.00);
    v_buyer_balance := 0.00;
  END IF;

  IF v_buyer_balance < p_price THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Create order
  INSERT INTO public.model_orders (buyer_id, seller_id, model_id, price, status, completed_at)
  VALUES (p_buyer_id, v_seller_id, p_model_id, p_price, 'completed', now())
  RETURNING id INTO v_order_id;

  -- Deduct from buyer
  UPDATE public.user_wallets
  SET balance = balance - p_price,
      updated_at = now()
  WHERE user_id = p_buyer_id;

  -- Add to seller (create wallet if doesn't exist)
  INSERT INTO public.user_wallets (user_id, balance)
  VALUES (v_seller_id, p_price)
  ON CONFLICT (user_id) 
  DO UPDATE SET balance = user_wallets.balance + p_price,
                updated_at = now();

  -- Record buyer transaction
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, related_order_id)
  VALUES (p_buyer_id, -p_price, 'purchase', 'Zakup modelu', v_order_id);

  -- Record seller transaction
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, description, related_order_id)
  VALUES (v_seller_id, p_price, 'sale', 'Sprzedaż modelu', v_order_id);

  RETURN v_order_id;
END;
$$;

-- Create trigger to update updated_at on user_wallets
CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Initial wallet setup for existing users (optional)
INSERT INTO public.user_wallets (user_id, balance)
SELECT id, 100.00 FROM auth.users
ON CONFLICT (user_id) DO NOTHING;