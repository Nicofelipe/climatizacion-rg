import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

function getEncryptionKey(): Buffer {
  const encryptionKey =
    process.env.STORAGE_ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error(
      'STORAGE_ENCRYPTION_KEY is not configured'
    );
  }

  const key = Buffer.from(encryptionKey, 'hex');

  if (key.length !== 32) {
    throw new Error(
      'STORAGE_ENCRYPTION_KEY must be a 32-byte hexadecimal key'
    );
  }

  return key;
}

export function encryptSecret(value: string): string {
  const key = getEncryptionKey();

  // GCM recommends a unique 12-byte IV for each encryption.
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    ALGORITHM,
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(value, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decryptSecret(value: string): string {
  const key = getEncryptionKey();

  const parts = value.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(
    encryptedHex,
    'hex'
  );

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    iv
  );

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}