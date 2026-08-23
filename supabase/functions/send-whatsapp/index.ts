import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  to: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`WhatsApp request from user: ${user.id}`);

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM');

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, message }: WhatsAppRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for comparison (remove all non-digits)
    let formattedPhone = to.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '55' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('55') && formattedPhone.length <= 11) {
      formattedPhone = '55' + formattedPhone;
    }

    // Authorization check: verify user has permission to send to this number
    // Check 1: Is this the user's own phone number?
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', user.id)
      .single();

    const userPhone = userProfile?.phone?.replace(/\D/g, '') || '';
    const userPhoneFormatted = userPhone.startsWith('55') ? userPhone : '55' + userPhone;
    
    let isAuthorized = formattedPhone === userPhoneFormatted;

    // Check 2: Is this a client's phone number that the user advises?
    if (!isAuthorized) {
      const { data: clientLinks } = await supabase
        .from('clients')
        .select('phone')
        .eq('advisor_id', user.id);
      
      const clientPhones = (clientLinks || [])
        .map(c => {
          const phone = c.phone?.replace(/\D/g, '') || '';
          return phone.startsWith('55') ? phone : '55' + phone;
        })
        .filter(p => p.length > 2);
      
      isAuthorized = clientPhones.includes(formattedPhone);
    }

    // Check 3: Is user an admin?
    if (!isAuthorized) {
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      isAuthorized = userRoles?.some(r => r.role === 'admin') || false;
    }

    if (!isAuthorized) {
      console.error(`User ${user.id} not authorized to message ${formattedPhone}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Not authorized to message this number' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending WhatsApp to: whatsapp:+${formattedPhone}`);

    // Send via Twilio WhatsApp API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('To', `whatsapp:+${formattedPhone}`);
    formData.append('From', fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', result);
      return new Response(
        JSON.stringify({ success: false, error: result.message || 'Failed to send WhatsApp' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('WhatsApp sent successfully:', result.sid);

    // Log the message for audit purposes
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'whatsapp_sent',
        details: {
          to: formattedPhone.slice(0, 4) + '****' + formattedPhone.slice(-4), // Masked phone
          message_sid: result.sid
        }
      });

    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('send-whatsapp error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
