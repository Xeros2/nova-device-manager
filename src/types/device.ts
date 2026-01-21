export type DeviceStatus = 'trial' | 'active' | 'expired' | 'banned';
export type DevicePlatform = 'android' | 'ios' | 'windows' | 'mac';
export type DeviceArchitecture = 'arm64' | 'x64';

export interface Device {
  id: string;
  device_id: string;
  platform: DevicePlatform;
  os_version: string;
  device_model: string;
  architecture: DeviceArchitecture;
  player_version: string;
  app_build: number;

  ip_address: string | null;
  country: string | null;
  city: string | null;
  isp: string | null;
  is_vpn: boolean;

  status: DeviceStatus;
  trial_start: string | null;
  trial_end: string | null;
  days_left: number;
  extended_count: number;
  manual_override: boolean;

  first_seen: string;
  last_seen: string;

  // UID + PIN system
  uid: string | null;
  pin_created_at: string | null;
  // Note: pin_hash n'est JAMAIS exposé au frontend

  notes: string | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface DeviceActionLog {
  id: string;
  device_id: string;
  action: ActionType;
  details: Record<string, unknown> | null;
  admin_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export type ActionType =
  | 'register'
  | 'status_check'
  | 'activate'
  | 'ban'
  | 'unban'
  | 'extend_trial'
  | 'reset_trial'
  | 'set_expiry'
  | 'add_note'
  | 'batch_action'
  | 'regenerate_pin';

export interface DeviceFilters {
  status?: DeviceStatus;
  platform?: DevicePlatform;
  country?: string;
  player_version?: string;
  trial_expired?: boolean;
  manual_override?: boolean;
  search?: string;
}

export interface DeviceStats {
  total: number;
  trial: number;
  active: number;
  expired: number;
  banned: number;
  platforms: Record<DevicePlatform, number>;
  countries: Record<string, number>;
}
