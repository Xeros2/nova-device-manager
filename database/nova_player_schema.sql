-- ============================================================================
-- Nova Player Core - PostgreSQL Vanilla Schema
-- Version: 1.0.0
-- Compatibility: PostgreSQL 15+
-- Last Updated: 2026-01-21
-- ============================================================================
--
-- IMPORTANT: Ce schema est 100% PostgreSQL standard.
-- Aucune dependance Supabase (auth, storage, realtime, etc.)
--
-- Usage:
--   createdb nova_player
--   psql -d nova_player < database/nova_player_schema.sql
--
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Statut d'un device
CREATE TYPE device_status AS ENUM (
  'trial',      -- Periode d'essai
  'active',     -- Licence active
  'expired',    -- Expire
  'banned'      -- Banni
);

-- Plateforme du device
CREATE TYPE device_platform AS ENUM (
  'android',
  'ios',
  'windows',
  'mac'
);

-- Architecture du device
CREATE TYPE device_architecture AS ENUM (
  'arm64',
  'x64'
);

-- Role administrateur
CREATE TYPE admin_role AS ENUM (
  'super_admin',
  'admin',
  'moderator'
);

-- Type d'acteur pour les logs
CREATE TYPE actor_type AS ENUM (
  'system',
  'admin',
  'user'
);

-- Actions pour device_logs (lifecycle)
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

-- Actions pour admin_logs (audit trail)
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

-- Actions pour device_action_logs
CREATE TYPE action_type AS ENUM (
  'register',
  'status_check',
  'activate',
  'ban',
  'unban',
  'extend_trial',
  'reset_trial',
  'set_expiry',
  'add_note',
  'batch_action',
  'regenerate_pin'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: admin_users
-- Description: Comptes administrateurs du panel
-- ----------------------------------------------------------------------------
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  role admin_role NOT NULL DEFAULT 'admin',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_users IS 'Comptes administrateurs du panel Nova Player';
COMMENT ON COLUMN admin_users.password_hash IS 'Hash bcrypt du mot de passe';
COMMENT ON COLUMN admin_users.role IS 'super_admin | admin | moderator';

-- ----------------------------------------------------------------------------
-- Table: devices
-- Description: Table principale contenant tous les devices enregistres
-- ----------------------------------------------------------------------------
CREATE TABLE devices (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL UNIQUE,
  
  -- Systeme UID/PIN
  uid TEXT UNIQUE,                              -- Format: NVP-XXXXXX
  pin_hash TEXT,                                -- Hash bcrypt du PIN
  pin_created_at TIMESTAMPTZ,                   -- Date creation/regeneration PIN
  
  -- Informations device
  platform device_platform NOT NULL,
  os_version TEXT NOT NULL,
  device_model TEXT NOT NULL,
  architecture device_architecture NOT NULL,
  player_version TEXT NOT NULL,
  app_build INTEGER NOT NULL DEFAULT 1,
  
  -- Geolocalisation
  ip_address TEXT,
  country TEXT,
  city TEXT,
  isp TEXT,
  is_vpn BOOLEAN NOT NULL DEFAULT false,
  
  -- Statut et trial
  status device_status NOT NULL DEFAULT 'trial',
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ,
  days_left INTEGER NOT NULL DEFAULT 7,
  extended_count INTEGER NOT NULL DEFAULT 0,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadonnees
  notes TEXT,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE devices IS 'Table principale des devices Nova Player';
COMMENT ON COLUMN devices.uid IS 'Identifiant public unique format NVP-XXXXXX';
COMMENT ON COLUMN devices.pin_hash IS 'Hash bcrypt du PIN (jamais stocke en clair)';
COMMENT ON COLUMN devices.manual_override IS 'Si true, ignore le calcul automatique du trial';

-- ----------------------------------------------------------------------------
-- Table: device_logs
-- Description: Historique des evenements lifecycle des devices
-- ----------------------------------------------------------------------------
CREATE TABLE device_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  uid TEXT,
  action device_log_action NOT NULL,
  previous_status device_status,
  new_status device_status,
  actor_type actor_type NOT NULL DEFAULT 'system',
  actor_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  reason TEXT,
  ip_address TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE device_logs IS 'Historique des evenements lifecycle des devices';
COMMENT ON COLUMN device_logs.actor_type IS 'system | admin | user';
COMMENT ON COLUMN device_logs.metadata IS 'Donnees supplementaires JSON';

-- ----------------------------------------------------------------------------
-- Table: admin_logs
-- Description: Audit trail des actions administrateurs
-- ----------------------------------------------------------------------------
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  admin_email TEXT,
  action admin_log_action NOT NULL,
  target_device_id TEXT,
  target_uid TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE admin_logs IS 'Audit trail des actions administrateurs';
COMMENT ON COLUMN admin_logs.details IS 'Details de l action en JSON';

-- ----------------------------------------------------------------------------
-- Table: device_action_logs
-- Description: Actions effectuees sur les devices (legacy compatibility)
-- ----------------------------------------------------------------------------
CREATE TABLE device_action_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  action action_type NOT NULL,
  details JSONB,
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE device_action_logs IS 'Actions effectuees sur les devices';

-- ----------------------------------------------------------------------------
-- Table: api_logs
-- Description: Logs des appels API (performance monitoring)
-- ----------------------------------------------------------------------------
CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  device_id TEXT,
  uid TEXT,
  ip_address TEXT,
  response_status INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE api_logs IS 'Logs des appels API pour monitoring';
COMMENT ON COLUMN api_logs.response_time_ms IS 'Temps de reponse en millisecondes';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Devices
CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_platform ON devices(platform);
CREATE INDEX idx_devices_country ON devices(country);
CREATE INDEX idx_devices_last_seen ON devices(last_seen DESC);
CREATE INDEX idx_devices_created_at ON devices(created_at DESC);
CREATE INDEX idx_devices_trial_end ON devices(trial_end);

-- Device Logs
CREATE INDEX idx_device_logs_device_id ON device_logs(device_id);
CREATE INDEX idx_device_logs_created_at ON device_logs(created_at DESC);
CREATE INDEX idx_device_logs_action ON device_logs(action);

-- Admin Logs
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
CREATE INDEX idx_admin_logs_target_device ON admin_logs(target_device_id);

-- Device Action Logs
CREATE INDEX idx_device_action_logs_device_id ON device_action_logs(device_id);
CREATE INDEX idx_device_action_logs_action ON device_action_logs(action);
CREATE INDEX idx_device_action_logs_created_at ON device_action_logs(created_at DESC);

-- API Logs
CREATE INDEX idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX idx_api_logs_device_id ON api_logs(device_id);
CREATE INDEX idx_api_logs_response_status ON api_logs(response_status);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Description: Trigger pour mettre a jour automatiquement updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: purge_old_logs
-- Description: Supprime les logs de plus de 90 jours
-- Usage: SELECT purge_old_logs();
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_old_logs()
RETURNS TABLE(
  device_logs_deleted INTEGER,
  admin_logs_deleted INTEGER,
  api_logs_deleted INTEGER,
  action_logs_deleted INTEGER
) AS $$
DECLARE
  v_device_logs INTEGER;
  v_admin_logs INTEGER;
  v_api_logs INTEGER;
  v_action_logs INTEGER;
BEGIN
  DELETE FROM device_logs WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_device_logs = ROW_COUNT;
  
  DELETE FROM admin_logs WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_admin_logs = ROW_COUNT;
  
  DELETE FROM api_logs WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_api_logs = ROW_COUNT;
  
  DELETE FROM device_action_logs WHERE created_at < NOW() - INTERVAL '90 days';
  GET DIAGNOSTICS v_action_logs = ROW_COUNT;
  
  RETURN QUERY SELECT v_device_logs, v_admin_logs, v_api_logs, v_action_logs;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- Function: get_device_stats
-- Description: Retourne les statistiques globales des devices
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_device_stats()
RETURNS TABLE(
  total_devices BIGINT,
  trial_devices BIGINT,
  active_devices BIGINT,
  expired_devices BIGINT,
  banned_devices BIGINT,
  devices_today BIGINT,
  devices_this_week BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_devices,
    COUNT(*) FILTER (WHERE status = 'trial')::BIGINT AS trial_devices,
    COUNT(*) FILTER (WHERE status = 'active')::BIGINT AS active_devices,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT AS expired_devices,
    COUNT(*) FILTER (WHERE status = 'banned')::BIGINT AS banned_devices,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::BIGINT AS devices_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::BIGINT AS devices_this_week
  FROM devices;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour auto-update de updated_at sur devices
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON devices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour auto-update de updated_at sur admin_users
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA (Optional - Uncomment to create initial super admin)
-- ============================================================================

-- INSERT INTO admin_users (email, password_hash, name, role)
-- VALUES (
--   'admin@nova-player.fr',
--   '$2a$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX', -- bcrypt hash
--   'Super Admin',
--   'super_admin'
-- );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Uncomment to verify schema after import:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- SELECT enum_range(NULL::device_status);
-- SELECT enum_range(NULL::admin_role);
