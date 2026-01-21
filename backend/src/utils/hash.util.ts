import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a PIN using bcrypt
 */
export async function hashPIN(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verify a PIN against its hash
 */
export async function verifyPIN(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}
