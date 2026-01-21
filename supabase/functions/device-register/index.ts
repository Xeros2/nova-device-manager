import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterRequest {
  device_id: string;
  platform: 'android' | 'ios' | 'windows' | 'mac';
  os_version: string;
  device_model: string;
  architecture: 'arm64' | 'x64';
  player_version: string;
  app_build: number;
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

    const body: RegisterRequest = await req.json();
    console.log('[device-register] Incoming request:', body.device_id);

    // Validate required fields
    if (!body.device_id || !body.platform || !body.os_version || !body.device_model || !body.architecture || !body.player_version) {
      console.error('[device-register] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get client IP from request headers
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    // Calculate trial end date (7 days from now)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    // Check if device already exists
    const { data: existingDevice, error: fetchError } = await supabase
      .from('devices')
      .select('device_id, status, days_left, trial_end, manual_override')
      .eq('device_id', body.device_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[device-register] Fetch error:', fetchError);
      throw fetchError;
    }

    if (existingDevice) {
      console.log('[device-register] Device already exists:', existingDevice.device_id);
      
      // Update last_seen and device info
      const { error: updateError } = await supabase
        .from('devices')
        .update({
          last_seen: new Date().toISOString(),
          player_version: body.player_version,
          app_build: body.app_build,
          ip_address,
        })
        .eq('device_id', body.device_id);

      if (updateError) {
        console.error('[device-register] Update error:', updateError);
      }

      // Return existing device status
      return new Response(
        JSON.stringify({
          status: existingDevice.status,
          days_left: existingDevice.days_left,
          trial_end: existingDevice.trial_end,
          manual_override: existingDevice.manual_override,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new device
    const newDevice = {
      device_id: body.device_id,
      platform: body.platform,
      os_version: body.os_version,
      device_model: body.device_model,
      architecture: body.architecture,
      player_version: body.player_version,
      app_build: body.app_build,
      ip_address,
      status: 'trial',
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      days_left: 7,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('devices')
      .insert(newDevice)
      .select()
      .single();

    if (error) {
      console.error('[device-register] Insert error:', error);
      throw error;
    }

    console.log('[device-register] Device registered successfully:', data.device_id);

    // Log the registration
    await supabase.from('device_action_logs').insert({
      device_id: body.device_id,
      action: 'register',
      details: { platform: body.platform, player_version: body.player_version },
      ip_address,
    });

    return new Response(
      JSON.stringify({
        status: 'trial',
        days_left: 7,
        trial_end: trialEnd.toISOString().split('T')[0],
        manual_override: false,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[device-register] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
