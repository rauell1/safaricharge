import crypto from 'crypto';

const MIN_PASSWORD_LENGTH = 8;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function isValidPassword(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT_OPTIONS).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHashHex] = storedHash.split(':');
  if (!salt || !expectedHashHex) return false;

  const expected = Buffer.from(expectedHashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length, SCRYPT_OPTIONS);
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

export function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, tokenHash };
}

export function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
