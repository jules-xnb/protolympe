import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const _rawKey = process.env.ENCRYPTION_KEY;
if (!_rawKey || Buffer.from(_rawKey, 'hex').length !== 32) {
  throw new Error('ENCRYPTION_KEY environment variable is required (64 hex chars = 32 bytes)');
}
const KEY: string = _rawKey;

export function encrypt(plaintext: string): string {
  const key = Buffer.from(KEY, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = Buffer.from(KEY, 'hex');
  const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
  if (!ivHex || !authTagHex || !encrypted) throw new Error('Invalid ciphertext format');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
