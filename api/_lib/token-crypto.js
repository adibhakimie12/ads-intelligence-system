import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';

const readEncryptionKey = () => {
  const rawKey = process.env.META_TOKEN_ENCRYPTION_KEY;
  if (!rawKey) {
    return null;
  }

  try {
    const base64Key = Buffer.from(rawKey, 'base64');
    if (base64Key.length === 32) {
      return base64Key;
    }
  } catch {
    // Fall back to utf8 parsing below.
  }

  const utf8Key = Buffer.from(rawKey, 'utf8');
  if (utf8Key.length === 32) {
    return utf8Key;
  }

  return null;
};

export const isTokenEncryptionConfigured = Boolean(readEncryptionKey());

export const encryptAccessToken = (plainTextToken) => {
  const key = readEncryptionKey();
  if (!key) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY must be a 32-byte UTF-8 or base64 value.');
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const cipherText = Buffer.concat([
    cipher.update(plainTextToken, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return {
    cipherText: cipherText.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    version: ENCRYPTION_VERSION,
    hint: plainTextToken.slice(-6),
  };
};

export const decryptAccessToken = ({ cipherText, iv, authTag }) => {
  const key = readEncryptionKey();
  if (!key) {
    throw new Error('META_TOKEN_ENCRYPTION_KEY must be a 32-byte UTF-8 or base64 value.');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));

  const plainText = Buffer.concat([
    decipher.update(Buffer.from(cipherText, 'base64')),
    decipher.final(),
  ]);

  return plainText.toString('utf8');
};
