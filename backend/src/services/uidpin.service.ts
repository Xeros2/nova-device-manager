import prisma from '../config/database';

// Characters for UID generation (excluding confusing chars: I, O, 0, 1)
const UID_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const UID_PREFIX = 'NVP-';
const UID_LENGTH = 6;

/**
 * Generate a random UID in format NVP-XXXXXX
 */
export function generateUID(): string {
  let uid = UID_PREFIX;
  for (let i = 0; i < UID_LENGTH; i++) {
    uid += UID_CHARS.charAt(Math.floor(Math.random() * UID_CHARS.length));
  }
  return uid;
}

/**
 * Generate a random 6-digit PIN
 */
export function generatePIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique UID (checks database for collisions)
 */
export async function generateUniqueUID(): Promise<string> {
  let uid = '';
  let exists = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (exists && attempts < maxAttempts) {
    uid = generateUID();
    const existing = await prisma.device.findUnique({
      where: { uid },
      select: { uid: true },
    });
    exists = !!existing;
    attempts++;
  }

  if (exists) {
    throw new Error('Failed to generate unique UID after maximum attempts');
  }

  return uid;
}
