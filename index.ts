import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const MPESA_B2C_URL = "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest";
const MPESA_AUTH_URL = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";

serve(async (req) => {
  const { payoutId } = await req.json();

  // 1. Initialize Supabase Client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // 2. Fetch Payout Details
  const { data: payout, error: pError } = await supabase
    .from('payments')
    .select('*, bookings(guest_id, properties(host_id, profiles(phone, full_name)))')
    .eq('id', payoutId)
    .single();

  if (pError || !payout) return new Response(JSON.stringify({ error: 'Payout not found' }), { status: 404 });

  const hostPhone = payout.bookings.properties.profiles.phone.replace('+', '').replace(/^0/, '254');
  const amount = Math.floor(payout.net_amount);

  try {
    // 3. Get M-Pesa OAuth Token
    const auth = btoa(`${Deno.env.get('MPESA_CONSUMER_KEY')}:${Deno.env.get('MPESA_CONSUMER_SECRET')}`);
    const authRes = await fetch(MPESA_AUTH_URL, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const { access_token } = await authRes.json();

    // 4. Generate Security Credential (Simplified for example - usually requires RSA encryption)
    // In production, use the Web Crypto API to encrypt the Initiator Password with Safaricom's Certificate
    const securityCredential = Deno.env.get('MPESA_SECURITY_CREDENTIAL'); 

    // 5. Call M-Pesa B2C API
    const b2cPayload = {
      InitiatorName: Deno.env.get('MPESA_INITIATOR_NAME'),
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: amount,
      PartyA: Deno.env.get('MPESA_SHORTCODE'), // Your B2C Shortcode
      PartyB: hostPhone, // Host Phone Number
      Remarks: `Payout for Booking ${payout.booking_id}`,
      QueueTimeOutURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
      ResultURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
      Occasion: "HostPayout",
      OriginatorConversationID: payout.id
    };

    const mpesaRes = await fetch(MPESA_B2C_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cPayload)
    });

    const mpesaData = await mpesaRes.json();

    // 6. Update Payout Status to processing
    await supabase
      .from('payments')
      .update({ 
        status: 'processing', 
        gateway_response: JSON.stringify(mpesaData) 
      })
      .eq('id', payoutId);

    return new Response(JSON.stringify(mpesaData), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})