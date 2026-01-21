import { Request, Response } from 'express';
import { z } from 'zod';
import { registerDevice, checkDeviceStatus } from '../services/device.service';
import { success, error, badRequest, notFound } from '../utils/response.util';

// ══════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ══════════════════════════════════════════════════════════════════════════

const registerSchema = z.object({
  device_id: z.string().min(1, 'device_id is required'),
  platform: z.enum(['android', 'ios', 'windows', 'mac']),
  os_version: z.string().min(1, 'os_version is required'),
  device_model: z.string().min(1, 'device_model is required'),
  architecture: z.enum(['arm64', 'x64']),
  player_version: z.string().min(1, 'player_version is required'),
  app_build: z.number().int().positive().optional().default(1),
});

const statusSchema = z.object({
  device_id: z.string().min(1, 'device_id is required'),
});

// ══════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════

function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }
  return req.socket.remoteAddress || 'unknown';
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROLLERS
// ══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/device/register
 * Register a new device or return status for existing device
 */
export async function handleRegister(req: Request, res: Response): Promise<Response> {
  const startTime = Date.now();

  try {
    // Validate input
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors.map(e => e.message).join(', ');
      return badRequest(res, messages);
    }

    const input = parseResult.data;
    const ip_address = getClientIP(req);

    const { response, isNew } = await registerDevice(
      { ...input, ip_address },
      startTime
    );

    // 201 for new device, 200 for existing
    return success(res, response, isNew ? 201 : 200);

  } catch (err) {
    console.error('[device/register] Error:', err);
    return error(res, 'Internal server error', 500);
  }
}

/**
 * POST /api/device/status
 * Check device status
 */
export async function handleStatus(req: Request, res: Response): Promise<Response> {
  const startTime = Date.now();

  try {
    // Validate input
    const parseResult = statusSchema.safeParse(req.body);
    if (!parseResult.success) {
      const messages = parseResult.error.errors.map(e => e.message).join(', ');
      return badRequest(res, messages);
    }

    const { device_id } = parseResult.data;
    const ip_address = getClientIP(req);

    const response = await checkDeviceStatus(device_id, ip_address, startTime);

    if (!response) {
      return notFound(res, 'Device');
    }

    return success(res, response);

  } catch (err) {
    console.error('[device/status] Error:', err);
    return error(res, 'Internal server error', 500);
  }
}
