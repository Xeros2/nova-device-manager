-- Ajouter les colonnes UID et PIN à la table devices
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS uid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS pin_hash TEXT,
ADD COLUMN IF NOT EXISTS pin_created_at TIMESTAMP WITH TIME ZONE;

-- Index pour recherche rapide par UID
CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_uid ON public.devices(uid);

-- Ajouter le nouveau type d'action regenerate_pin
ALTER TYPE public.action_type ADD VALUE IF NOT EXISTS 'regenerate_pin';