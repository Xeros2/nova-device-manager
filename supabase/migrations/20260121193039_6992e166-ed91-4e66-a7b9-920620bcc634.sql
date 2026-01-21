-- ══════════════════════════════════════════════════════════════════════════
-- Nova Player Core - Logging System Tables
-- Tables for device lifecycle, admin actions, and API monitoring
-- ══════════════════════════════════════════════════════════════════════════

-- Enum for actor types
DO $$ BEGIN
  CREATE TYPE actor_type AS ENUM ('system', 'admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum for log actions (device lifecycle)
DO $$ BEGIN
  CREATE TYPE device_log_action AS ENUM (
    'device_registered',
    'trial_started',
    'trial_extended',
    'trial_expired',
    'status_check',
    'status_changed',
    'device_banned',
    'device_unbanned',
    'pin_regenerated',
    'device_activated',
    'manual_override_set'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Enum for admin log actions
DO $$ BEGIN
  CREATE TYPE admin_log_action AS ENUM (
    'login',
    'logout',
    'device_view',
    'device_update',
    'device_activate',
    'device_ban',
    'device_unban',
    'trial_extend',
    'trial_reset',
    'pin_regenerate',
    'batch_action',
    'note_added',
    'settings_changed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: device_logs
-- Tracks all device lifecycle events
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.device_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  uid TEXT,
  action device_log_action NOT NULL,
  previous_status device_status,
  new_status device_status,
  actor_type actor_type NOT NULL DEFAULT 'system',
  actor_id UUID,
  reason TEXT,
  metadata JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_device_logs_device_id ON public.device_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_device_logs_uid ON public.device_logs(uid);
CREATE INDEX IF NOT EXISTS idx_device_logs_created_at ON public.device_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_logs_action ON public.device_logs(action);
CREATE INDEX IF NOT EXISTS idx_device_logs_actor_id ON public.device_logs(actor_id);

-- RLS
ALTER TABLE public.device_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon log insert" ON public.device_logs;
DROP POLICY IF EXISTS "Admins can view device logs" ON public.device_logs;

-- Allow edge functions to insert (anon)
CREATE POLICY "Allow anon log insert" ON public.device_logs
  FOR INSERT WITH CHECK (true);

-- Admins can view all logs
CREATE POLICY "Admins can view device logs" ON public.device_logs
  FOR SELECT USING (has_admin_role(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: admin_logs
-- Tracks all admin actions for audit trail
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_email TEXT,
  action admin_log_action NOT NULL,
  target_device_id TEXT,
  target_uid TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON public.admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target_device_id ON public.admin_logs(target_device_id);

-- RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can insert logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Admins can view admin logs" ON public.admin_logs;
DROP POLICY IF EXISTS "Allow anon admin log insert" ON public.admin_logs;

-- Allow edge functions to insert (for async logging)
CREATE POLICY "Allow anon admin log insert" ON public.admin_logs
  FOR INSERT WITH CHECK (true);

-- Admins can view all logs
CREATE POLICY "Admins can view admin logs" ON public.admin_logs
  FOR SELECT USING (has_admin_role(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- TABLE: api_logs
-- Tracks all API calls for monitoring and debugging
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  device_id TEXT,
  uid TEXT,
  ip_address TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON public.api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_device_id ON public.api_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_response_status ON public.api_logs(response_status);

-- RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anon api log insert" ON public.api_logs;
DROP POLICY IF EXISTS "Admins can view api logs" ON public.api_logs;

-- Allow edge functions to insert (anon)
CREATE POLICY "Allow anon api log insert" ON public.api_logs
  FOR INSERT WITH CHECK (true);

-- Admins can view all API logs
CREATE POLICY "Admins can view api logs" ON public.api_logs
  FOR SELECT USING (has_admin_role(auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTION: Auto-purge old logs (> 90 days)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.purge_old_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM device_logs WHERE created_at < now() - interval '90 days';
  DELETE FROM admin_logs WHERE created_at < now() - interval '90 days';
  DELETE FROM api_logs WHERE created_at < now() - interval '90 days';
END;
$$;

-- Comment for documentation
COMMENT ON TABLE public.device_logs IS 'Tracks device lifecycle events (register, status changes, bans, etc.)';
COMMENT ON TABLE public.admin_logs IS 'Audit trail for all admin actions';
COMMENT ON TABLE public.api_logs IS 'API monitoring and performance logs';