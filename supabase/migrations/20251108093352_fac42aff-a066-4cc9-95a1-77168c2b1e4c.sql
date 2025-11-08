-- Insert Solana Pay payment method
INSERT INTO public.payment_methods (method_key, name, description, is_active, sort_order, config)
VALUES (
  'solana_pay',
  'Płatność Crypto (Solana)',
  'Płatność tokenami SPL w sieci Solana',
  false,
  11,
  '{
    "recipient_wallet": "",
    "token_mint": "",
    "token_symbol": "",
    "token_decimals": 9,
    "network": "devnet",
    "price_per_token": 1.00
  }'::jsonb
)
ON CONFLICT (method_key) DO NOTHING;