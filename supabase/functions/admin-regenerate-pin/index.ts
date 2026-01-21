import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function logToTable(supabase: ReturnType<typeof createClient>, table: string, data: Record<string, unknown>): Promise<void> {
  try { await supabase.from(table).insert(data); } catch (e) { console.error(`[LOG] Failed:`, e); }
}

function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAuth = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', 
      { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: hasRole } = await supabase.rpc('has_admin_role', { _user_id: user.id });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    if (!body.device_id) {
      return new Response(JSON.stringify({ error: 'device_id is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: device } = await supabase.from('devices').select('device_id, uid, status').eq('device_id', body.device_id).maybeSingle();
    if (!device) {
      return new Response(JSON.stringify({ error: 'Device not found' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const newPin = generatePIN();
    const newPinHash = await bcrypt.hash(newPin);

    await supabase.from('devices').update({ pin_hash: newPinHash, pin_created_at: new Date().toISOString() }).eq('device_id', body.device_id);

    EdgeRuntime.waitUntil(Promise.all([
      logToTable(supabase, 'device_action_logs', { device_id: body.device_id, action: 'regenerate_pin', details: { reason: 'admin_request' }, admin_id: user.id, ip_address }),
      logToTable(supabase, 'device_logs', { device_id: body.device_id, uid: device.uid, action: 'pin_regenerated', new_status: device.status, actor_type: 'admin', actor_id: user.id, ip_address }),
      logToTable(supabase, 'admin_logs', { admin_id: user.id, admin_email: user.email, action: 'pin_regenerate', target_device_id: body.device_id, target_uid: device.uid, ip_address }),
    ]));

    return new Response(JSON.stringify({ success: true, device_id: body.device_id, uid: device.uid, new_pin: newPin }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[admin-regenerate-pin] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
