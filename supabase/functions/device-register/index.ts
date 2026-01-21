import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

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

// Async logging - uses any to avoid strict typing issues with dynamic table names
async function logToTable(supabase: any, table: string, data: any): Promise<void> {
  try { 
    await supabase.from(table).insert(data); 
  } catch (e) { 
    console.error(`[LOG] Failed to log to ${table}:`, e); 
  }
}

function generateUID(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let uid = 'NVP-';
  for (let i = 0; i < 6; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}

function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function generateUniqueUID(supabase: any): Promise<string> {
  let uid = '';
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    uid = generateUID();
    const { data } = await supabase.from('devices').select('uid').eq('uid', uid).maybeSingle();
    exists = !!data;
    attempts++;
  }
  if (exists) throw new Error('Failed to generate unique UID');
  return uid;
}

// ══════════════════════════════════════════════════════════════════════════
// ⚠️ RÈGLE DE SÉCURITÉ CRITIQUE ⚠️
// UID + PIN sont générés UNIQUEMENT à la PREMIÈRE inscription
// Ils ne sont JAMAIS recréés, même si le device revient
// Le PIN n'est retourné qu'UNE SEULE FOIS (status 201)
// ══════════════════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  try {
    const body: RegisterRequest = await req.json();
    
    if (!body.device_id || !body.platform || !body.os_version || !body.device_model || !body.architecture || !body.player_version) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    const { data: existingDevice, error: fetchError } = await supabase
      .from('devices').select('device_id, status, days_left, trial_end, manual_override, uid')
      .eq('device_id', body.device_id).maybeSingle();

    if (fetchError) throw fetchError;

    if (existingDevice) {
      // SÉCURITÉ: Device déjà enregistré - retourner UID existant SANS PIN
      console.log('[device-register] SECURITY: Device already registered, returning existing UID without PIN');
      
      await supabase.from('devices').update({
        last_seen: new Date().toISOString(),
        player_version: body.player_version,
        app_build: body.app_build,
        ip_address,
      }).eq('device_id', body.device_id);

      EdgeRuntime.waitUntil(logToTable(supabase, 'device_logs', {
        device_id: body.device_id, uid: existingDevice.uid, action: 'status_check',
        new_status: existingDevice.status, actor_type: 'system', ip_address,
      }));

      return new Response(JSON.stringify({
        status: existingDevice.status, uid: existingDevice.uid,
        days_left: existingDevice.days_left, trial_end: existingDevice.trial_end,
        manual_override: existingDevice.manual_override,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // NOUVEAU DEVICE - Génération unique UID + PIN
    console.log('[device-register] SECURITY: Creating NEW device with UID and PIN');
    
    const uid = await generateUniqueUID(supabase);
    const pin = generatePIN();
    const pinHash = await bcrypt.hash(pin);

    const { data, error } = await supabase.from('devices').upsert({
      device_id: body.device_id, platform: body.platform, os_version: body.os_version,
      device_model: body.device_model, architecture: body.architecture,
      player_version: body.player_version, app_build: body.app_build, ip_address,
      status: 'trial', trial_start: new Date().toISOString(), trial_end: trialEnd.toISOString(),
      days_left: 7, first_seen: new Date().toISOString(), last_seen: new Date().toISOString(),
      uid, pin_hash: pinHash, pin_created_at: new Date().toISOString(),
    }, { onConflict: 'device_id', ignoreDuplicates: true }).select().single();

    if (error) throw error;

    // Race condition check
    if (data.uid !== uid) {
      return new Response(JSON.stringify({
        status: data.status, uid: data.uid, days_left: data.days_left,
        trial_end: data.trial_end, manual_override: data.manual_override,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('[device-register] Device registered successfully:', data.device_id, 'UID:', uid);

    EdgeRuntime.waitUntil(Promise.all([
      logToTable(supabase, 'device_action_logs', { device_id: body.device_id, action: 'register', details: { platform: body.platform, uid }, ip_address }),
      logToTable(supabase, 'device_logs', { device_id: body.device_id, uid, action: 'device_registered', new_status: 'trial', actor_type: 'system', ip_address }),
      logToTable(supabase, 'api_logs', { endpoint: '/device-register', method: 'POST', device_id: body.device_id, uid, ip_address, response_status: 201, response_time_ms: Date.now() - startTime }),
    ]));

    // IMPORTANT: Retourner le PIN UNE SEULE FOIS
    return new Response(JSON.stringify({
      status: 'trial', uid, pin, days_left: 7,
      trial_end: trialEnd.toISOString().split('T')[0], manual_override: false,
    }), { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[device-register] Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
