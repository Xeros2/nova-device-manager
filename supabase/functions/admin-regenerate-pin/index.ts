import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegeneratePinRequest {
  device_id: string;
}

// Génère un PIN à 6 chiffres
function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification admin
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('[admin-regenerate-pin] No authorization header');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Créer un client avec le token utilisateur pour vérifier les permissions
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    );

    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    
    if (authError || !user) {
      console.error('[admin-regenerate-pin] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier le rôle admin via la fonction has_admin_role
    const { data: hasRole, error: roleError } = await supabase
      .rpc('has_admin_role', { _user_id: user.id });

    if (roleError || !hasRole) {
      console.error('[admin-regenerate-pin] User is not admin:', user.id);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[admin-regenerate-pin] Admin verified:', user.id);

    // Récupérer le body de la requête
    const body: RegeneratePinRequest = await req.json();

    if (!body.device_id) {
      return new Response(
        JSON.stringify({ error: 'device_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier que le device existe
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('device_id, uid')
      .eq('device_id', body.device_id)
      .maybeSingle();

    if (fetchError) {
      console.error('[admin-regenerate-pin] Fetch error:', fetchError);
      throw fetchError;
    }

    if (!device) {
      return new Response(
        JSON.stringify({ error: 'Device not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Générer et hasher le nouveau PIN
    const newPin = generatePIN();
    const newPinHash = await bcrypt.hash(newPin);

    console.log('[admin-regenerate-pin] Regenerating PIN for device:', body.device_id);

    // Mettre à jour le device avec le nouveau hash
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        pin_hash: newPinHash,
        pin_created_at: new Date().toISOString(),
      })
      .eq('device_id', body.device_id);

    if (updateError) {
      console.error('[admin-regenerate-pin] Update error:', updateError);
      throw updateError;
    }

    // Logger l'action
    await supabase.from('device_action_logs').insert({
      device_id: body.device_id,
      action: 'regenerate_pin',
      details: { reason: 'admin_request' },
      admin_id: user.id,
    });

    console.log('[admin-regenerate-pin] PIN regenerated successfully for:', body.device_id);

    // Retourner le nouveau PIN (UNE SEULE FOIS)
    return new Response(
      JSON.stringify({
        success: true,
        device_id: body.device_id,
        uid: device.uid,
        new_pin: newPin, // ⚠️ Affiché une seule fois
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[admin-regenerate-pin] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
