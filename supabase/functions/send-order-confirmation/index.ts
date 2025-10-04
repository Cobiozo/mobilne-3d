import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import nodemailer from 'npm:nodemailer@6.9.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderConfirmationRequest {
  orderId: string;
  customerEmail: string;
  orderNumber: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalPrice: number;
  deliveryMethod: string;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentDetails?: {
    accountNumber?: string;
    accountHolder?: string;
    transferTitle?: string;
  };
  invoiceData?: {
    companyName: string;
    nip: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      orderId,
      customerEmail,
      orderNumber,
      items,
      totalPrice,
      deliveryMethod,
      paymentMethod,
      shippingAddress,
      paymentDetails,
      invoiceData
    }: OrderConfirmationRequest = await req.json();

    // Get SMTP settings
    const { data: smtpSettings, error: settingsError } = await supabase
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (settingsError || !smtpSettings) {
      throw new Error('SMTP settings not configured');
    }

    // Decrypt SMTP password
    const { data: decryptedPassword, error: decryptError } = await supabase
      .rpc('decrypt_smtp_password', {
        encrypted_password: smtpSettings.smtp_password_encrypted
      });

    if (decryptError || !decryptedPassword) {
      console.error('Failed to decrypt SMTP password:', decryptError);
      throw new Error('Failed to decrypt SMTP password');
    }

    // Build email content
    const itemsList = items.map(item => 
      `<li>${item.name} - ${item.quantity} szt. × ${(item.price / item.quantity).toFixed(2)} zł = ${item.price.toFixed(2)} zł</li>`
    ).join('');

    const paymentInfo = paymentDetails?.accountNumber ? `
      <h3 style="color: #333; margin-top: 30px;">Dane do przelewu:</h3>
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Numer konta:</strong> ${paymentDetails.accountNumber}</p>
        ${paymentDetails.accountHolder ? `<p style="margin: 5px 0;"><strong>Odbiorca:</strong> ${paymentDetails.accountHolder}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Kwota:</strong> ${totalPrice.toFixed(2)} zł</p>
        <p style="margin: 5px 0;"><strong>Tytuł przelewu:</strong> ${paymentDetails.transferTitle || orderNumber}</p>
      </div>
      <p style="color: #666;">Zamówienie zostanie zrealizowane po zaksięgowaniu płatności na naszym koncie.</p>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Potwierdzenie zamówienia</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
          <h1 style="color: #2563eb; margin-top: 0;">Dziękujemy za zamówienie!</h1>
          
          <p>Witaj ${shippingAddress.name},</p>
          <p>Twoje zamówienie <strong>${orderNumber}</strong> zostało przyjęte i jest obecnie w realizacji.</p>
          
          <h2 style="color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Szczegóły zamówienia</h2>
          
          <h3 style="color: #333;">Produkty:</h3>
          <ul style="list-style: none; padding: 0;">
            ${itemsList}
          </ul>
          
          <div style="background-color: #e5e7eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Suma produktów:</strong> ${totalPrice.toFixed(2)} zł</p>
            <p style="margin: 5px 0;"><strong>Dostawa:</strong> ${deliveryMethod === 'paczkomaty' ? 'Paczkomaty InPost' : 'Kurier InPost'}</p>
            <p style="margin: 5px 0; font-size: 18px; color: #2563eb;"><strong>Razem:</strong> ${totalPrice.toFixed(2)} zł</p>
          </div>

          ${paymentInfo}
          
          <h3 style="color: #333; margin-top: 30px;">Adres dostawy:</h3>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <p style="margin: 5px 0;">${shippingAddress.name}</p>
            <p style="margin: 5px 0;">${shippingAddress.address}</p>
            <p style="margin: 5px 0;">${shippingAddress.postalCode} ${shippingAddress.city}</p>
            <p style="margin: 5px 0;">${shippingAddress.country}</p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #666; font-size: 14px;">
              Dziękujemy za zaufanie!<br>
              Zespół Mobilne-3D
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
              Jeśli masz pytania dotyczące zamówienia, skontaktuj się z nami:<br>
              Email: biuro@mobilne-3d.pl<br>
              Tel: +48 518 339 298
            </p>
          </div>

          ${invoiceData ? `
          <div style="margin-top: 30px; padding: 20px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px;">
              📄 Dane do faktury VAT
            </h3>
            <div style="font-size: 14px; color: #1f2937; line-height: 1.6;">
              <p style="margin: 5px 0;"><strong>Firma:</strong> ${invoiceData.companyName}</p>
              <p style="margin: 5px 0;"><strong>NIP:</strong> ${invoiceData.nip}</p>
              <p style="margin: 5px 0;"><strong>Adres:</strong> ${invoiceData.address}</p>
              <p style="margin: 5px 0;">${invoiceData.postalCode} ${invoiceData.city}</p>
              <p style="margin: 5px 0;"><strong>Kraj:</strong> ${invoiceData.country}</p>
            </div>
          </div>
    ` : ''}
        </div>
      </body>
    </html>
  `;

    // Create nodemailer transporter
    const transporter = nodemailer.createTransport({
      host: smtpSettings.smtp_host,
      port: smtpSettings.smtp_port,
      secure: smtpSettings.smtp_secure,
      auth: {
        user: smtpSettings.smtp_user,
        pass: decryptedPassword,
      },
    });

    console.log('Attempting to send order confirmation email via nodemailer...');

    // Send email using nodemailer
    const info = await transporter.sendMail({
      from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
      to: customerEmail,
      subject: `Potwierdzenie zamówienia ${orderNumber}`,
      html: htmlContent,
    });

    console.log('Email sent successfully:', info.messageId);

    // Log email
    await supabase.from('email_logs').insert({
      user_id: null,
      recipient_email: customerEmail,
      subject: `Potwierdzenie zamówienia ${orderNumber}`,
      template_type: 'order_confirmation',
      status: 'sent',
      sent_at: new Date().toISOString(),
      error_message: null,
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
        message_id: info.messageId,
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Order confirmation sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending order confirmation:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
