import prisma from '../config/database';
import { env } from '../config/env';
import { generateUniqueUID, generatePIN } from './uidpin.service';
import { hashPIN } from '../utils/hash.util';
import { logDeviceEvent, logDeviceAction, logApiCall, logAsync } from './logger.service';
import { DevicePlatform, DeviceArchitecture } from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════

export interface RegisterDeviceInput {
  device_id: string;
  platform: DevicePlatform;
  os_version: string;
  device_model: string;
  architecture: DeviceArchitecture;
  player_version: string;
  app_build?: number;
  ip_address?: string;
}

export interface DeviceStatusResponse {
  status: string;
  uid?: string;
  pin?: string; // Only returned once on creation
  days_left: number;
  trial_end: string;
  manual_override: boolean;
}

// ══════════════════════════════════════════════════════════════════════════
// REGISTER DEVICE
// ══════════════════════════════════════════════════════════════════════════

export async function registerDevice(
  input: RegisterDeviceInput,
  startTime: number
): Promise<{ response: DeviceStatusResponse; isNew: boolean }> {
  const { device_id, platform, os_version, device_model, architecture, player_version, app_build = 1, ip_address } = input;

  // Check if device already exists
  const existingDevice = await prisma.device.findUnique({
    where: { device_id },
    select: {
      device_id: true,
      status: true,
      uid: true,
      days_left: true,
      trial_end: true,
      manual_override: true,
    },
  });

  if (existingDevice) {
    // SECURITY: Device already registered - return existing UID WITHOUT PIN
    console.log('[device-register] Device already registered, returning existing UID without PIN');

    // Update last_seen and device info
    await prisma.device.update({
      where: { device_id },
      data: {
        last_seen: new Date(),
        player_version,
        app_build,
        ip_address,
      },
    });

    // Log status check (fire and forget)
    logAsync(logDeviceEvent({
      device_id,
      uid: existingDevice.uid ?? undefined,
      action: 'status_check',
      new_status: existingDevice.status,
      ip_address,
    }));

    return {
      response: {
        status: existingDevice.status,
        uid: existingDevice.uid ?? undefined,
        days_left: existingDevice.days_left,
        trial_end: existingDevice.trial_end?.toISOString().split('T')[0] ?? '',
        manual_override: existingDevice.manual_override,
      },
      isNew: false,
    };
  }

  // NEW DEVICE - Generate unique UID + PIN
  console.log('[device-register] Creating NEW device with UID and PIN');

  const uid = await generateUniqueUID();
  const pin = generatePIN();
  const pinHash = await hashPIN(pin);

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + env.DEFAULT_TRIAL_DAYS);

  // Create device with upsert for race condition protection
  const device = await prisma.device.upsert({
    where: { device_id },
    create: {
      device_id,
      platform,
      os_version,
      device_model,
      architecture,
      player_version,
      app_build,
      ip_address,
      status: 'trial',
      trial_start: new Date(),
      trial_end: trialEnd,
      days_left: env.DEFAULT_TRIAL_DAYS,
      first_seen: new Date(),
      last_seen: new Date(),
      uid,
      pin_hash: pinHash,
      pin_created_at: new Date(),
    },
    update: {
      // If race condition occurred, just update last_seen
      last_seen: new Date(),
      player_version,
      app_build,
      ip_address,
    },
  });

  // Race condition check - if our UID wasn't used, return without PIN
  if (device.uid !== uid) {
    console.log('[device-register] Race condition detected, returning existing device');
    return {
      response: {
        status: device.status,
        uid: device.uid ?? undefined,
        days_left: device.days_left,
        trial_end: device.trial_end?.toISOString().split('T')[0] ?? '',
        manual_override: device.manual_override,
      },
      isNew: false,
    };
  }

  console.log(`[device-register] Device registered: ${device_id}, UID: ${uid}`);

  // Log all events (fire and forget)
  logAsync(Promise.all([
    logDeviceAction({
      device_id,
      action: 'register',
      details: { platform, uid },
      ip_address,
    }),
    logDeviceEvent({
      device_id,
      uid,
      action: 'device_registered',
      new_status: 'trial',
      ip_address,
    }),
    logApiCall({
      endpoint: '/api/device/register',
      method: 'POST',
      device_id,
      uid,
      ip_address,
      response_status: 201,
      response_time_ms: Date.now() - startTime,
    }),
  ]).then(() => {}));

  // IMPORTANT: Return PIN ONLY ONCE
  return {
    response: {
      status: 'trial',
      uid,
      pin, // Only returned on first registration!
      days_left: env.DEFAULT_TRIAL_DAYS,
      trial_end: trialEnd.toISOString().split('T')[0],
      manual_override: false,
    },
    isNew: true,
  };
}

// ══════════════════════════════════════════════════════════════════════════
// CHECK DEVICE STATUS
// ══════════════════════════════════════════════════════════════════════════

export async function checkDeviceStatus(
  device_id: string,
  ip_address?: string,
  startTime?: number
): Promise<DeviceStatusResponse | null> {
  const device = await prisma.device.findUnique({
    where: { device_id },
  });

  if (!device) {
    return null;
  }

  // Calculate days left
  let daysLeft = device.days_left;
  let status = device.status;

  if (device.trial_end && !device.manual_override) {
    const now = new Date();
    const trialEnd = new Date(device.trial_end);
    const diffTime = trialEnd.getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    // Auto-expire if trial is over
    if (daysLeft <= 0 && status === 'trial') {
      status = 'expired';
    }
  }

  // Update device
  await prisma.device.update({
    where: { device_id },
    data: {
      last_seen: new Date(),
      ip_address,
      days_left: daysLeft,
      status,
    },
  });

  // Log status check (fire and forget)
  logAsync(Promise.all([
    logDeviceAction({
      device_id,
      action: 'status_check',
      details: { status, days_left: daysLeft },
      ip_address,
    }),
    logDeviceEvent({
      device_id,
      uid: device.uid ?? undefined,
      action: 'status_check',
      new_status: status,
      ip_address,
    }),
    ...(startTime ? [logApiCall({
      endpoint: '/api/device/status',
      method: 'POST',
      device_id,
      uid: device.uid ?? undefined,
      ip_address,
      response_status: 200,
      response_time_ms: Date.now() - startTime,
    })] : []),
  ]).then(() => {}));

  return {
    status,
    days_left: daysLeft,
    trial_end: device.trial_end?.toISOString().split('T')[0] ?? '',
    manual_override: device.manual_override,
  };
}
