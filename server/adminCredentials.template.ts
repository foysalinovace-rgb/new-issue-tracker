import { scrypt, timingSafeEqual } from 'node:crypto';

// Server-only. Store a one-way password hash, never the plaintext password.
export const ADMIN_EMAIL = 'support@inovacetech.com';
const PASSWORD_SALT = '__ADMIN_PASSWORD_SALT__';
const PASSWORD_HASH = '__ADMIN_PASSWORD_HASH__';

export async function verifyAdmin(email: unknown, password: unknown): Promise<boolean> {
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || Buffer.byteLength(password) > 256) return false;
  const derived = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, Buffer.from(PASSWORD_SALT, 'hex'), 64, (error, key) => error ? reject(error) : resolve(key));
  });
  const validPassword = timingSafeEqual(derived, Buffer.from(PASSWORD_HASH, 'hex'));
  return validPassword && email.trim().toLowerCase() === ADMIN_EMAIL;
}
