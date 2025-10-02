import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SmtpClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject?: string;
  templateKey?: string;
  templateData?: Record<string, string>;
  html?: string;
  text?: string;
  userId?: string;
}

// Replace template variables like {{variable}} with actual values
function replaceTemplateVars(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    
    if (userError || !user) {
      throw new Error('Invalid token');
    }

    const emailRequest: EmailRequest = await req.json();
    const { to, subject, templateKey, templateData = {}, html, text, userId } = emailRequest;

    console.log(`Processing email request for ${to}, template: ${templateKey || 'custom'}`);

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabaseClient
      .from('smtp_settings')
      .select('*')
      .eq('is_active', true)
      .single();

    if (smtpError || !smtpSettings) {
      throw new Error('SMTP settings not configured');
    }

    let emailSubject = subject;
    let emailHtml = html;
    let emailText = text;

    // If template key provided, fetch and process template
    if (templateKey) {
      const { data: template, error: templateError } = await supabaseClient
        .from('email_templates')
        .select('*')
        .eq('template_key', templateKey)
        .eq('language', templateData.language || 'pl')
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        throw new Error(`Email template not found: ${templateKey}`);
      }

      emailSubject = replaceTemplateVars(template.subject, templateData);
      emailHtml = replaceTemplateVars(template.html_body, templateData);
      emailText = template.text_body ? replaceTemplateVars(template.text_body, templateData) : undefined;
    }

    if (!emailSubject || !emailHtml) {
      throw new Error('Email subject and content are required');
    }

    // Log email attempt
    const { data: logEntry } = await supabaseClient
      .from('email_logs')
      .insert({
        user_id: userId || user.id,
        recipient_email: to,
        subject: emailSubject,
        template_type: templateKey || 'custom',
        status: 'pending',
        metadata: { templateData }
      })
      .select()
      .single();

    try {
      // Send email via SMTP using denomailer
      const client = new SmtpClient({
        connection: {
          hostname: smtpSettings.smtp_host,
          port: smtpSettings.smtp_port,
          tls: smtpSettings.smtp_secure,
          auth: {
            username: smtpSettings.smtp_user,
            password: Deno.env.get('SMTP_PASSWORD') ?? '',
          },
        },
      });

      await client.send({
        from: `${smtpSettings.from_name} <${smtpSettings.from_email}>`,
        to: to,
        subject: emailSubject,
        content: emailText || emailSubject,
        html: emailHtml,
      });

      await client.close();

      // Update log as sent
      if (logEntry) {
        await supabaseClient
          .from('email_logs')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', logEntry.id);
      }

      console.log(`Email sent successfully to ${to}`);

      return new Response(JSON.stringify({
        success: true,
        message: 'Email sent successfully',
        sentAt: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (emailError) {
      console.error('SMTP error:', emailError);
      
      // Update log with error
      if (logEntry) {
        await supabaseClient
          .from('email_logs')
          .update({ 
            status: 'failed',
            error_message: emailError instanceof Error ? emailError.message : 'Unknown error'
          })
          .eq('id', logEntry.id);
      }

      throw emailError;
    }

  } catch (error) {
    console.error('Error in send-notification function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred',
        success: false 
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});