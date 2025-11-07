import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { Connection, PublicKey } from "npm:@solana/web3.js@^1.98.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const solanaRpcUrl = Deno.env.get('SOLANA_RPC_URL') || 'https://api.mainnet-beta.solana.com';
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { orderId, signature, expectedAmount, tokenMint, recipientWallet } = await req.json();

    console.log('Verifying Solana payment:', {
      orderId,
      signature,
      expectedAmount,
      tokenMint,
      recipientWallet,
    });

    if (!orderId || !signature || !expectedAmount || !tokenMint || !recipientWallet) {
      throw new Error('Missing required parameters');
    }

    // Connect to Solana
    const connection = new Connection(solanaRpcUrl, 'confirmed');

    // Get transaction details
    const tx = await connection.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new Error('Transaction not found');
    }

    console.log('Transaction found:', {
      slot: tx.slot,
      blockTime: tx.blockTime,
      err: tx.meta?.err,
    });

    // Check if transaction was successful
    if (tx.meta?.err) {
      throw new Error('Transaction failed on blockchain');
    }

    // Verify the transaction details
    const recipientPubkey = new PublicKey(recipientWallet);
    const tokenMintPubkey = new PublicKey(tokenMint);

    // Get token balance changes
    const preBalances = tx.meta?.preTokenBalances || [];
    const postBalances = tx.meta?.postTokenBalances || [];

    // Find recipient's token account change
    let receivedAmount = 0;
    for (let i = 0; i < postBalances.length; i++) {
      const preBalance = preBalances.find(b => b.accountIndex === postBalances[i].accountIndex);
      if (
        postBalances[i].mint === tokenMint &&
        postBalances[i].owner === recipientWallet
      ) {
        const preAmount = preBalance ? parseInt(preBalance.uiTokenAmount.amount) : 0;
        const postAmount = parseInt(postBalances[i].uiTokenAmount.amount);
        receivedAmount = postAmount - preAmount;
        break;
      }
    }

    console.log('Amount verification:', {
      receivedAmount,
      expectedAmount,
      match: receivedAmount === expectedAmount,
    });

    // Verify amount
    if (receivedAmount < expectedAmount) {
      throw new Error(`Insufficient amount received. Expected ${expectedAmount}, got ${receivedAmount}`);
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order:', updateError);
      throw updateError;
    }

    console.log('Order updated successfully:', orderId);

    // Log the transaction
    await supabase.from('audit_logs').insert({
      action: 'solana_payment_verified',
      resource_type: 'order',
      resource_id: orderId,
      details: {
        signature,
        receivedAmount,
        expectedAmount,
        tokenMint,
        recipientWallet,
      },
      severity: 'info',
    });

    // Send order confirmation email
    try {
      const { data: orderData } = await supabase
        .from('orders')
        .select('customer_email, order_number')
        .eq('id', orderId)
        .single();

      if (orderData?.customer_email) {
        await supabase.functions.invoke('send-order-confirmation', {
          body: {
            orderId,
            orderNumber: orderData.order_number,
            customerEmail: orderData.customer_email,
          },
        });
      }
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't fail the payment if email fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        signature,
        orderId,
        status: 'confirmed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in solana-payment function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
