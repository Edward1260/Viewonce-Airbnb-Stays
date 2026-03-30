import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await req.json();
    const result = body.Result;

    // 1. Initialize Supabase with Service Role Key (to bypass RLS for system updates)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Extract our internal Payout ID (stored in OriginatorConversationID)
    const payoutId = result.OriginatorConversationID;
    const resultCode = result.ResultCode;
    const resultDesc = result.ResultDesc;

    console.log(`Processing M-Pesa callback for Payout: ${payoutId}, Result: ${resultCode}`);

    // 3. Determine status based on M-Pesa ResultCode (0 is success)
    const newStatus = resultCode === 0 ? 'completed' : 'failed';

    // 4. Update the payment record
    const { error } = await supabase
      .from('payments')
      .update({ 
        status: newStatus,
        gateway_response: JSON.stringify(result),
        updated_at: new Date().toISOString()
      })
      .eq('id', payoutId);

    if (error) throw error;

    // 5. If successful, we could also notify the host via a 'notifications' table here
    if (newStatus === 'completed') {
        // Optional: Trigger a logic to notify host
    }

    return new Response(JSON.stringify({ Message: "Success" }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });

  } catch (err) {
    console.error('Callback Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { "Content-Type": "application/json" },
      status: 500 
    });
  }
})