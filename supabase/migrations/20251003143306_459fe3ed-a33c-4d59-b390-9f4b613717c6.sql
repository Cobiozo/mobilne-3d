-- Allow users to update their own wallet (for spending virtual currency on orders)
CREATE POLICY "Users can update their own wallet"
ON public.user_wallets
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to create their own wallet transactions (for order payments)
CREATE POLICY "Users can create their own transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);