import prisma from '../config/database';
import { ActionType } from '@prisma/client';

interface DeviceLogData {
  device_id: string;
  uid?: string;
  action: string;
  previous_status?: string;
  new_status?: string;
  actor_type?: string;
  actor_id?: string;
  reason?: string;
  ip_address?: string;
}

interface ActionLogData {
  device_id: string;
  action: ActionType;
  details?: Record<string, unknown>;
  admin_id?: string;
  ip_address?: string;
}

interface ApiLogData {
  endpoint: string;
  method: string;
  device_id?: string;
  uid?: string;
  ip_address?: string;
  response_status: number;
  response_time_ms: number;
  error_message?: string;
}

/**
 * Log device lifecycle events
 */
export async function logDeviceEvent(data: DeviceLogData): Promise<void> {
  try {
    await prisma.deviceLog.create({
      data: {
        device_id: data.device_id,
        uid: data.uid,
        action: data.action,
        previous_status: data.previous_status,
        new_status: data.new_status,
        actor_type: data.actor_type ?? 'system',
        actor_id: data.actor_id,
        reason: data.reason,
        ip_address: data.ip_address,
      },
    });
  } catch (error) {
    console.error('[Logger] Failed to log device event:', error);
  }
}

/**
 * Log device actions (register, status_check, etc.)
 */
export async function logDeviceAction(data: ActionLogData): Promise<void> {
  try {
    await prisma.deviceActionLog.create({
      data: {
        device_id: data.device_id,
        action: data.action,
        details: data.details ?? undefined,
        admin_id: data.admin_id,
        ip_address: data.ip_address,
      },
    });
  } catch (error) {
    console.error('[Logger] Failed to log device action:', error);
  }
}

/**
 * Log API calls for monitoring
 */
export async function logApiCall(data: ApiLogData): Promise<void> {
  try {
    await prisma.apiLog.create({
      data: {
        endpoint: data.endpoint,
        method: data.method,
        device_id: data.device_id,
        uid: data.uid,
        ip_address: data.ip_address,
        response_status: data.response_status,
        response_time_ms: data.response_time_ms,
        error_message: data.error_message,
      },
    });
  } catch (error) {
    console.error('[Logger] Failed to log API call:', error);
  }
}

/**
 * Fire and forget logging (non-blocking)
 */
export function logAsync(promise: Promise<void>): void {
  promise.catch((error) => {
    console.error('[Logger] Async log failed:', error);
  });
}
