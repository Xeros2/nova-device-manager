import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logToTable(supabase: ReturnType<typeof createClient>, table: string, data: Record<string, unknown>): Promise<void> {
  try { await supabase.from(table).insert(data); } catch (e) { console.error(`[LOG] Failed:`, e); }
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

  try {
    const body = await req.json();
    if (!body.device_id) {
      return new Response(JSON.stringify({ error: 'device_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ip_address = body.ip_address || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const { data: device, error: fetchError } = await supabase.from('devices').select('*').eq('device_id', body.device_id).maybeSingle();

    if (fetchError) throw fetchError;
    if (!device) {
      return new Response(JSON.stringify({ error: 'Device not found', status: 'unknown', days_left: 0, trial_end: null, manual_override: false }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let days_left = device.days_left;
    let status = device.status;
    const previousStatus = device.status;

    if (device.trial_end && !device.manual_override) {
      const diffTime = new Date(device.trial_end).getTime() - Date.now();
      days_left = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      if (days_left === 0 && status === 'trial') status = 'expired';
    }

    await supabase.from('devices').update({ last_seen: new Date().toISOString(), ip_address, days_left, status }).eq('device_id', body.device_id);

    const logs = [
      logToTable(supabase, 'device_action_logs', { device_id: body.device_id, action: 'status_check', details: { status, days_left }, ip_address }),
      logToTable(supabase, 'device_logs', { device_id: body.device_id, uid: device.uid, action: 'status_check', new_status: status, actor_type: 'system', ip_address }),
    ];
    if (previousStatus !== status) {
      logs.push(logToTable(supabase, 'device_logs', { device_id: body.device_id, uid: device.uid, action: 'trial_expired', previous_status: previousStatus, new_status: status, actor_type: 'system', ip_address }));
    }
    EdgeRuntime.waitUntil(Promise.all(logs));

    return new Response(JSON.stringify({ status, days_left, trial_end: device.trial_end?.split('T')[0] || null, manual_override: device.manual_override }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[device-status] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
