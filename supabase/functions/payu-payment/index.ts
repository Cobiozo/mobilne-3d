import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fetch with timeout wrapper
const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs = 10000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
};

interface PayUProduct {
  name: string;
  unitPrice: string;
  quantity: string;
}

interface PayUOrderRequest {
  customerIp: string;
  merchantPosId: string;
  description: string;
  currencyCode: string;
  totalAmount: string;
  buyer: {
    email: string;
    phone?: string;
    firstName: string;
    lastName: string;
    language: string;
  };
  products: PayUProduct[];
  continueUrl: string;
  notifyUrl?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get PayU settings from database
    const { data: payuSettings, error: settingsError } = await supabaseClient
      .from('payu_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (settingsError || !payuSettings) {
      console.error('No active PayU settings found:', settingsError);
      throw new Error('PayU settings not configured');
    }

    // Decrypt MD5 and Client Secret
    const { data: decryptedMd5, error: md5Error } = await supabaseClient.rpc('decrypt_payu_credential', {
      encrypted_credential: payuSettings.md5_encrypted
    });

    const { data: decryptedSecret, error: secretError } = await supabaseClient.rpc('decrypt_payu_credential', {
      encrypted_credential: payuSettings.client_secret_encrypted
    });

    if (md5Error || secretError || !decryptedMd5 || !decryptedSecret) {
      console.error('Failed to decrypt PayU credentials');
      throw new Error('Failed to decrypt PayU credentials');
    }

    console.log('Raw PayU settings from DB:', payuSettings);

    const PAYU_POS_ID = payuSettings.pos_id?.trim();
    const PAYU_CLIENT_ID = payuSettings.client_id?.trim();
    const PAYU_CLIENT_SECRET = decryptedSecret;
    const PAYU_MD5 = decryptedMd5;
    const PAYU_ENVIRONMENT = payuSettings.environment || 'sandbox';
    const PAYU_BASE_URL = PAYU_ENVIRONMENT === 'production' 
      ? 'https://secure.payu.com' 
      : 'https://secure.snd.payu.com';

    console.log('PayU credentials check:', {
      hasPosId: !!PAYU_POS_ID,
      hasClientId: !!PAYU_CLIENT_ID,
      hasClientSecret: !!PAYU_CLIENT_SECRET,
      hasMD5: !!PAYU_MD5,
      environment: PAYU_ENVIRONMENT,
      posIdValue: PAYU_POS_ID,
      clientIdValue: PAYU_CLIENT_ID
    });

    if (!PAYU_POS_ID || !PAYU_CLIENT_ID || !PAYU_CLIENT_SECRET) {
      throw new Error('PayU credentials incomplete. Please configure POS ID, Client ID, and Client Secret in admin panel.');
    }

    const { action, ...data } = await req.json();
    console.log('PayU request:', { action, data });

    // Get OAuth token - according to PayU docs
    const oauthUrl = `${PAYU_BASE_URL}/pl/standard/user/oauth/authorize`;
    console.log('Requesting OAuth token from:', oauthUrl);
    
    const tokenResponse = await fetchWithTimeout(oauthUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: PAYU_CLIENT_ID,
        client_secret: PAYU_CLIENT_SECRET,
      }),
    }, 15000);

    const tokenText = await tokenResponse.text();
    console.log('PayU OAuth response status:', tokenResponse.status);
    console.log('PayU OAuth response:', tokenText.substring(0, 500));
    
    if (!tokenResponse.ok) {
      console.error('PayU OAuth error - Full response:', tokenText);
      throw new Error(`Failed to get OAuth token (${tokenResponse.status}): ${tokenText.substring(0, 200)}`);
    }

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('Failed to parse OAuth response as JSON:', tokenText.substring(0, 200));
      throw new Error('Invalid OAuth response format');
    }
    
    const accessToken = tokenData.access_token;

    if (action === 'create_order') {
      // Create PayU order
      const orderData: PayUOrderRequest = {
        customerIp: data.customerIp || '127.0.0.1',
        merchantPosId: PAYU_POS_ID,
        description: data.description,
        currencyCode: 'PLN',
        totalAmount: Math.round(data.totalAmount * 100).toString(), // Convert to grosze
        buyer: {
          email: data.buyer.email,
          phone: data.buyer.phone,
          firstName: data.buyer.firstName,
          lastName: data.buyer.lastName,
          language: 'pl',
        },
        products: data.products.map((p: PayUProduct) => ({
          name: p.name,
          unitPrice: Math.round(parseFloat(p.unitPrice) * 100).toString(),
          quantity: p.quantity,
        })),
        continueUrl: data.continueUrl,
        notifyUrl: data.notifyUrl,
      };

      console.log('Creating PayU order:', orderData);
      
      const orderRequestHeaders = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': `Bearer ${accessToken}`,
      };
      
      console.log('Request headers:', orderRequestHeaders);
      console.log('Request URL:', `${PAYU_BASE_URL}/api/v2_1/orders`);

      const orderResponse = await fetch(`${PAYU_BASE_URL}/api/v2_1/orders`, {
        method: 'POST',
        headers: orderRequestHeaders,
        body: JSON.stringify(orderData),
        redirect: 'manual', // CRITICAL: Prevent following 302 redirects
      });

      const responseText = await orderResponse.text();
      console.log('PayU order response status:', orderResponse.status);
      console.log('PayU order response (first 500 chars):', responseText.substring(0, 500));

      // PayU returns 302 for successful order creation with redirect
      if (orderResponse.status !== 302 && !orderResponse.ok) {
        console.error('PayU order error - Full response:', responseText);
        throw new Error(`PayU order creation failed (${orderResponse.status}): ${responseText.substring(0, 300)}`);
      }

      let orderResult;
      try {
        orderResult = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse order response as JSON:', responseText.substring(0, 200));
        throw new Error('Invalid order response format');
      }

      return new Response(
        JSON.stringify({
          success: true,
          orderId: orderResult.orderId,
          redirectUri: orderResult.redirectUri,
          status: orderResult.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'verify_notification') {
      // Verify PayU notification signature and update order status
      const notification = data.notification;
      
      console.log('PayU notification received:', notification);

      // Extract order ID and payment status from notification
      const orderId = notification?.order?.extOrderId;
      const paymentStatus = notification?.order?.status;

      if (orderId && paymentStatus === 'COMPLETED') {
        // Get order details first
        const { data: orderData, error: fetchError } = await supabaseClient
          .from('orders')
          .select('customer_email, customer_first_name, order_number')
          .eq('id', orderId)
          .single();

        if (fetchError) {
          console.error('Failed to fetch order:', fetchError);
        }

        // Update order status to 'processing' (Do wysłania)
        const { error: updateError } = await supabaseClient
          .from('orders')
          .update({ status: 'processing' })
          .eq('id', orderId);

        if (updateError) {
          console.error('Failed to update order status:', updateError);
        } else {
          console.log(`Order ${orderId} status updated to 'processing'`);
          
          // Send order confirmation emails
          if (orderData) {
            try {
              await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-order-confirmation`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({
                  orderId: orderId,
                  customerEmail: orderData.customer_email,
                  customerName: orderData.customer_first_name,
                  orderNumber: orderData.order_number
                })
              });
              console.log('Order confirmation email sent');
            } catch (emailError) {
              console.error('Failed to send confirmation email:', emailError);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Notification processed'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_order_status') {
      // Get order status from PayU
      const orderId = data.orderId;

      const statusResponse = await fetch(`${PAYU_BASE_URL}/api/v2_1/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('PayU status check error:', errorText);
        throw new Error(`Failed to get order status: ${errorText}`);
      }

      const statusData = await statusResponse.json();

      return new Response(
        JSON.stringify({
          success: true,
          status: statusData.orders[0].status,
          order: statusData.orders[0],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Unknown action');

  } catch (error) {
    console.error('PayU function error:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
