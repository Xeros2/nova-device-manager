import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StatusRequest {
  device_id: string;
  ip_address?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: StatusRequest = await req.json();
    console.log('[device-status] Checking status for:', body.device_id);

    if (!body.device_id) {
      return new Response(
        JSON.stringify({ error: 'device_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP
    const ip_address = body.ip_address 
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    // Fetch device
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', body.device_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[device-status] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!device) {
      console.log('[device-status] Device not found:', body.device_id);
      return new Response(
        JSON.stringify({ 
          error: 'Device not found',
          status: 'unknown',
          days_left: 0,
          trial_end: null,
          manual_override: false,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate days left
    let days_left = device.days_left;
    let status = device.status;

    if (device.trial_end && !device.manual_override) {
      const trialEnd = new Date(device.trial_end);
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      days_left = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      
      // Auto-expire if trial ended and status is still trial
      if (days_left === 0 && status === 'trial') {
        status = 'expired';
      }
    }

    // Update device with new info
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        last_seen: new Date().toISOString(),
        ip_address,
        days_left,
        status,
      })
      .eq('device_id', body.device_id);

    if (updateError) {
      console.error('[device-status] Update error:', updateError);
    }

    // Log the status check
    await supabase.from('device_action_logs').insert({
      device_id: body.device_id,
      action: 'status_check',
      details: { status, days_left },
      ip_address,
    });

    console.log('[device-status] Returning status:', { status, days_left });

    // Return the status response (contract with Flutter)
    return new Response(
      JSON.stringify({
        status,
        days_left,
        trial_end: device.trial_end ? device.trial_end.split('T')[0] : null,
        manual_override: device.manual_override,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[device-status] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
