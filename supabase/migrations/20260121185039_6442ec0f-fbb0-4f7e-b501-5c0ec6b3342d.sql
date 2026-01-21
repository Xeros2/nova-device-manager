-- Create enum for device status
CREATE TYPE public.device_status AS ENUM ('trial', 'active', 'expired', 'banned');

-- Create enum for platform
CREATE TYPE public.device_platform AS ENUM ('android', 'ios', 'windows', 'mac');

-- Create enum for architecture
CREATE TYPE public.device_architecture AS ENUM ('arm64', 'x64');

-- Create devices table
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  platform device_platform NOT NULL,
  os_version TEXT NOT NULL,
  device_model TEXT NOT NULL,
  architecture device_architecture NOT NULL,
  player_version TEXT NOT NULL,
  app_build INTEGER NOT NULL DEFAULT 1,
  
  ip_address TEXT,
  country TEXT,
  city TEXT,
  isp TEXT,
  is_vpn BOOLEAN DEFAULT false,
  
  status device_status NOT NULL DEFAULT 'trial',
  trial_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trial_end TIMESTAMP WITH TIME ZONE,
  days_left INTEGER DEFAULT 7,
  extended_count INTEGER DEFAULT 0,
  manual_override BOOLEAN DEFAULT false,
  
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  notes TEXT,
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_users table for admin authentication
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create admin_roles table for role management
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin', 'moderator');

CREATE TABLE public.admin_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  UNIQUE(user_id, role)
);

-- Create device_action_logs table for audit trail
CREATE TYPE public.action_type AS ENUM (
  'register',
  'status_check',
  'activate',
  'ban',
  'unban',
  'extend_trial',
  'reset_trial',
  'set_expiry',
  'add_note',
  'batch_action'
);

CREATE TABLE public.device_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  action action_type NOT NULL,
  details JSONB,
  admin_id UUID,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_action_logs ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = _user_id
  )
$$;

-- Create security definer function to check super admin role
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- RLS Policies for devices table
-- Admins can read all devices
CREATE POLICY "Admins can view all devices"
ON public.devices
FOR SELECT
TO authenticated
USING (public.has_admin_role(auth.uid()));

-- Admins can update devices
CREATE POLICY "Admins can update devices"
ON public.devices
FOR UPDATE
TO authenticated
USING (public.has_admin_role(auth.uid()));

-- Admins can insert devices
CREATE POLICY "Admins can insert devices"
ON public.devices
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_role(auth.uid()));

-- Allow anon to insert (for device registration)
CREATE POLICY "Allow device registration"
ON public.devices
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon to update last_seen (for status check)
CREATE POLICY "Allow status updates"
ON public.devices
FOR UPDATE
TO anon
USING (true);

-- Allow anon to select own device by device_id
CREATE POLICY "Allow device status check"
ON public.devices
FOR SELECT
TO anon
USING (true);

-- RLS Policies for admin_users
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Super admins can manage admin users"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for admin_roles
CREATE POLICY "Admins can view roles"
ON public.admin_roles
FOR SELECT
TO authenticated
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Super admins can manage roles"
ON public.admin_roles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- RLS Policies for device_action_logs
CREATE POLICY "Admins can view logs"
ON public.device_action_logs
FOR SELECT
TO authenticated
USING (public.has_admin_role(auth.uid()));

CREATE POLICY "Admins can insert logs"
ON public.device_action_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_role(auth.uid()));

-- Allow anon to insert logs (for device registration/status)
CREATE POLICY "Allow anon log insert"
ON public.device_action_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_devices_device_id ON public.devices(device_id);
CREATE INDEX idx_devices_status ON public.devices(status);
CREATE INDEX idx_devices_platform ON public.devices(platform);
CREATE INDEX idx_devices_country ON public.devices(country);
CREATE INDEX idx_devices_last_seen ON public.devices(last_seen);
CREATE INDEX idx_device_logs_device_id ON public.device_action_logs(device_id);
CREATE INDEX idx_device_logs_created_at ON public.device_action_logs(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_devices_updated_at
BEFORE UPDATE ON public.devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();