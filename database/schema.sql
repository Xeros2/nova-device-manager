-- ============================================================================
-- Nova Player Core - Database Schema
-- Version: 1.0.0
-- Last Updated: 2026-01-21
-- ============================================================================
-- 
-- Ce fichier contient le schéma complet de la base de données Nova Player.
-- Il est fourni à titre de référence et de documentation.
-- Les migrations réelles se trouvent dans supabase/migrations/
--
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Statut d'un device
CREATE TYPE device_status AS ENUM (
  'trial',      -- Période d'essai
  'active',     -- Licence active
  'expired',    -- Expiré
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

-- Rôle admin
CREATE TYPE admin_role AS ENUM (
  'super_admin',
  'admin',
  'moderator'
);

-- Type d'action loggée
CREATE TYPE action_type AS ENUM (
  'register',         -- Enregistrement initial
  'status_check',     -- Vérification de status
  'activate',         -- Activation par admin
  'ban',              -- Bannissement
  'unban',            -- Débannissement
  'extend_trial',     -- Extension de trial
  'reset_trial',      -- Reset du trial
  'set_expiry',       -- Définition date expiration
  'add_note',         -- Ajout de note
  'batch_action',     -- Action groupée
  'regenerate_pin'    -- Régénération du PIN
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Table: devices
-- Description: Table principale contenant tous les devices enregistrés
-- ----------------------------------------------------------------------------
CREATE TABLE public.devices (
  -- Identifiants
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  
  -- Système UID/PIN
  uid TEXT UNIQUE,                              -- Format: NVP-XXXXXX
  pin_hash TEXT,                                -- Hash bcrypt du PIN
  pin_created_at TIMESTAMPTZ,                   -- Date création/régénération PIN
  
  -- Informations device
  platform device_platform NOT NULL,
  os_version TEXT NOT NULL,
  device_model TEXT NOT NULL,
  architecture device_architecture NOT NULL,
  player_version TEXT NOT NULL,
  app_build INTEGER NOT NULL DEFAULT 1,
  
  -- Géolocalisation
  ip_address TEXT,
  country TEXT,
  city TEXT,
  isp TEXT,
  is_vpn BOOLEAN DEFAULT false,
  
  -- Statut et trial
  status device_status NOT NULL DEFAULT 'trial',
  trial_start TIMESTAMPTZ DEFAULT now(),
  trial_end TIMESTAMPTZ,
  days_left INTEGER DEFAULT 7,
  extended_count INTEGER DEFAULT 0,
  manual_override BOOLEAN DEFAULT false,
  
  -- Timestamps
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  
  -- Métadonnées
  notes TEXT,
  created_by UUID,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche par UID
CREATE UNIQUE INDEX idx_devices_uid ON public.devices(uid);

-- Index pour recherche par status
CREATE INDEX idx_devices_status ON public.devices(status);

-- Index pour recherche par plateforme
CREATE INDEX idx_devices_platform ON public.devices(platform);

-- ----------------------------------------------------------------------------
-- Table: device_action_logs
-- Description: Historique de toutes les actions effectuées sur les devices
-- ----------------------------------------------------------------------------
CREATE TABLE public.device_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  action action_type NOT NULL,
  details JSONB,
  admin_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche par device
CREATE INDEX idx_action_logs_device ON public.device_action_logs(device_id);

-- Index pour recherche par date
CREATE INDEX idx_action_logs_created ON public.device_action_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- Table: admin_roles
-- Description: Rôles des administrateurs
-- ----------------------------------------------------------------------------
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  role admin_role NOT NULL DEFAULT 'admin'
);

-- ----------------------------------------------------------------------------
-- Table: admin_users
-- Description: Informations complémentaires des administrateurs
-- ----------------------------------------------------------------------------
CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Function: has_admin_role
-- Description: Vérifie si un utilisateur a un rôle admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = _user_id
  )
$$;

-- ----------------------------------------------------------------------------
-- Function: is_super_admin
-- Description: Vérifie si un utilisateur est super admin
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- ----------------------------------------------------------------------------
-- Function: update_updated_at_column
-- Description: Met à jour automatiquement le champ updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger pour mettre à jour updated_at sur devices
CREATE TRIGGER update_devices_updated_at
  BEFORE UPDATE ON public.devices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Policies: devices
-- ----------------------------------------------------------------------------

-- Admins peuvent voir tous les devices
CREATE POLICY "Admins can view all devices"
  ON public.devices
  FOR SELECT
  USING (has_admin_role(auth.uid()));

-- Admins peuvent modifier les devices
CREATE POLICY "Admins can update devices"
  ON public.devices
  FOR UPDATE
  USING (has_admin_role(auth.uid()));

-- Admins peuvent créer des devices
CREATE POLICY "Admins can insert devices"
  ON public.devices
  FOR INSERT
  WITH CHECK (has_admin_role(auth.uid()));

-- Permettre l'enregistrement public (Edge Function)
CREATE POLICY "Allow device registration"
  ON public.devices
  FOR INSERT
  WITH CHECK (true);

-- Permettre la vérification de status public
CREATE POLICY "Allow device status check"
  ON public.devices
  FOR SELECT
  USING (true);

-- Permettre les mises à jour de status
CREATE POLICY "Allow status updates"
  ON public.devices
  FOR UPDATE
  USING (true);

-- ----------------------------------------------------------------------------
-- Policies: device_action_logs
-- ----------------------------------------------------------------------------

-- Admins peuvent voir les logs
CREATE POLICY "Admins can view logs"
  ON public.device_action_logs
  FOR SELECT
  USING (has_admin_role(auth.uid()));

-- Admins peuvent créer des logs
CREATE POLICY "Admins can insert logs"
  ON public.device_action_logs
  FOR INSERT
  WITH CHECK (has_admin_role(auth.uid()));

-- Permettre les logs anonymes (Edge Functions)
CREATE POLICY "Allow anon log insert"
  ON public.device_action_logs
  FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Policies: admin_roles
-- ----------------------------------------------------------------------------

-- Admins peuvent voir les rôles
CREATE POLICY "Admins can view roles"
  ON public.admin_roles
  FOR SELECT
  USING (has_admin_role(auth.uid()));

-- Super admins peuvent gérer les rôles
CREATE POLICY "Super admins can manage roles"
  ON public.admin_roles
  FOR ALL
  USING (is_super_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- Policies: admin_users
-- ----------------------------------------------------------------------------

-- Admins peuvent voir les utilisateurs admin
CREATE POLICY "Admins can view admin users"
  ON public.admin_users
  FOR SELECT
  USING (has_admin_role(auth.uid()));

-- Super admins peuvent gérer les utilisateurs admin
CREATE POLICY "Super admins can manage admin users"
  ON public.admin_users
  FOR ALL
  USING (is_super_admin(auth.uid()));
