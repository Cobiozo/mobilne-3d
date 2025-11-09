import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Connection, PublicKey } from "npm:@solana/web3.js@1.98.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token_mint, network = 'mainnet-beta' } = await req.json();

    if (!token_mint) {
      return new Response(
        JSON.stringify({ error: 'Token mint address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching token info for: ${token_mint} on ${network}`);

    // Get RPC URL from environment (handle empty strings properly)
    const envRpcUrl = Deno.env.get('SOLANA_RPC_URL');
    const rpcUrl = (envRpcUrl && envRpcUrl.trim() !== '') 
      ? envRpcUrl 
      : (network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com');
    
    console.log(`Using RPC URL: ${rpcUrl}`);

    // 1. Connect to Solana and get token decimals
    const connection = new Connection(rpcUrl, 'confirmed');
    let decimals = 9; // default
    
    try {
      const mintPubkey = new PublicKey(token_mint);
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
      
      if (mintInfo.value && 'parsed' in mintInfo.value.data) {
        decimals = mintInfo.value.data.parsed.info.decimals;
        console.log(`Token decimals from RPC: ${decimals}`);
      }
    } catch (error) {
      console.error('Error fetching mint info:', error);
      return new Response(
        JSON.stringify({ error: 'Invalid token mint address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Fetch token price and symbol from Jupiter API
    let symbol = 'UNKNOWN';
    let priceUsd = 0;
    let priceSource = 'manual_required';

    try {
      const jupiterResponse = await fetch(
        `https://price.jup.ag/v4/price?ids=${token_mint}`
      );
      
      if (jupiterResponse.ok) {
        const jupiterData = await jupiterResponse.json();
        const tokenData = jupiterData.data?.[token_mint];
        
        if (tokenData) {
          symbol = tokenData.mintSymbol || symbol;
          priceUsd = tokenData.price || 0;
          priceSource = priceUsd > 0 ? 'jupiter' : 'manual_required';
          console.log(`Jupiter API - Symbol: ${symbol}, Price USD: ${priceUsd}`);
        }
      }
    } catch (error) {
      console.error('Error fetching from Jupiter:', error);
    }

    // 3. Fetch USD/PLN exchange rate from NBP API
    let usdPlnRate = 4.0; // fallback
    
    try {
      const nbpResponse = await fetch(
        'https://api.nbp.pl/api/exchangerates/rates/a/usd?format=json'
      );
      
      if (nbpResponse.ok) {
        const nbpData = await nbpResponse.json();
        usdPlnRate = nbpData.rates[0].mid;
        console.log(`USD/PLN rate from NBP: ${usdPlnRate}`);
      }
    } catch (error) {
      console.error('Error fetching USD/PLN rate:', error);
    }

    // 4. Calculate price in PLN
    const pricePln = priceUsd > 0 ? Number((priceUsd * usdPlnRate).toFixed(2)) : 0;

    const result = {
      success: true,
      data: {
        token_mint,
        symbol,
        decimals,
        price_usd: priceUsd,
        price_pln: pricePln,
        usd_pln_rate: usdPlnRate,
        source: priceSource,
        timestamp: new Date().toISOString(),
      }
    };

    console.log('Token info fetched successfully:', result);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in fetch-token-info:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
