import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

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

// Génère un UID au format NVP-XXXXXX (6 caractères alphanumériques lisibles)
function generateUID(): string {
  // Caractères sans ambiguïté (sans I, O, 0, 1 pour lisibilité)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let uid = 'NVP-';
  for (let i = 0; i < 6; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}

// Génère un PIN à 6 chiffres
function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Génère un UID unique en vérifiant les collisions
async function generateUniqueUID(supabaseClient: any): Promise<string> {
  let uid: string = '';
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (exists && attempts < maxAttempts) {
    uid = generateUID();
    const { data } = await supabaseClient
      .from('devices')
      .select('uid')
      .eq('uid', uid)
      .maybeSingle();
    exists = !!data;
    attempts++;
  }

  if (exists) {
    throw new Error('Failed to generate unique UID after ' + maxAttempts + ' attempts');
  }

  return uid;
}

// ══════════════════════════════════════════════════════════════════════════
// ⚠️ RÈGLE DE SÉCURITÉ CRITIQUE ⚠️
// UID + PIN sont générés UNIQUEMENT à la PREMIÈRE inscription
// Ils ne sont JAMAIS recréés, même si le device revient
// Le PIN n'est retourné qu'UNE SEULE FOIS (status 201)
// Toute modification de cette logique doit être validée par l'équipe sécurité
// ══════════════════════════════════════════════════════════════════════════

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
      .select('device_id, status, days_left, trial_end, manual_override, uid')
      .eq('device_id', body.device_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[device-register] Fetch error:', fetchError);
      throw fetchError;
    }

    if (existingDevice) {
      // ══════════════════════════════════════════════════════════════════════
      // SÉCURITÉ: Device déjà enregistré - retourner UID existant SANS PIN
      // Le PIN n'est JAMAIS renvoyé après la création initiale
      // ══════════════════════════════════════════════════════════════════════
      console.log('[device-register] SECURITY: Device already registered, returning existing UID without PIN');
      console.log('[device-register] device_id:', existingDevice.device_id, 'uid:', existingDevice.uid);
      
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

      // Return existing device status (WITHOUT PIN - never return PIN after creation)
      return new Response(
        JSON.stringify({
          status: existingDevice.status,
          uid: existingDevice.uid,
          days_left: existingDevice.days_left,
          trial_end: existingDevice.trial_end,
          manual_override: existingDevice.manual_override,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // NOUVEAU DEVICE - Génération unique UID + PIN
    // Cette section ne s'exécute qu'UNE SEULE FOIS par device_id
    // ══════════════════════════════════════════════════════════════════════
    console.log('[device-register] SECURITY: Creating NEW device with UID and PIN');
    console.log('[device-register] device_id:', body.device_id);

    // 1. Générer UID unique
    const uid = await generateUniqueUID(supabase);
    console.log('[device-register] Generated UID:', uid);

    // 2. Générer et hasher le PIN
    const pin = generatePIN();
    const pinHash = await bcrypt.hash(pin);
    console.log('[device-register] PIN generated and hashed (PIN will be returned ONCE)');

    // 3. Créer le nouveau device avec protection contre les race conditions
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
      uid,
      pin_hash: pinHash,
      pin_created_at: new Date().toISOString(),
    };

    // Utiliser upsert avec onConflict pour éviter les race conditions
    // Si deux requêtes arrivent simultanément, seule la première crée le device
    const { data, error } = await supabase
      .from('devices')
      .upsert(newDevice, { 
        onConflict: 'device_id',
        ignoreDuplicates: true 
      })
      .select()
      .single();

    if (error) {
      console.error('[device-register] Insert error:', error);
      throw error;
    }
    
    // Vérifier si c'est vraiment une nouvelle création (le UID correspond)
    if (data.uid !== uid) {
      // Race condition détectée : un autre processus a créé le device
      console.log('[device-register] SECURITY: Race condition detected, device was created by another request');
      console.log('[device-register] Returning existing device without PIN');
      return new Response(
        JSON.stringify({
          status: data.status,
          uid: data.uid,
          days_left: data.days_left,
          trial_end: data.trial_end,
          manual_override: data.manual_override,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[device-register] Device registered successfully:', data.device_id, 'UID:', uid);

    // Log the registration
    await supabase.from('device_action_logs').insert({
      device_id: body.device_id,
      action: 'register',
      details: { 
        platform: body.platform, 
        player_version: body.player_version,
        uid: uid 
      },
      ip_address,
    });

    // IMPORTANT: Retourner le PIN UNE SEULE FOIS (à la création)
    return new Response(
      JSON.stringify({
        status: 'trial',
        uid: uid,
        pin: pin, // ⚠️ Retourné uniquement ici, à la création
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
