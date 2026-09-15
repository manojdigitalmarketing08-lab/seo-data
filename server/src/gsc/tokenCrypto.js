const crypto = require('crypto');
const { TOKEN_ENCRYPTION_KEY } = require('../config');

const ALGO = 'aes-256-gcm';
const key = Buffer.from(TOKEN_ENCRYPTION_KEY, 'hex');

if (key.length !== 32) {
  throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes hex-encoded (64 hex chars)');
}

// Encrypts a refresh token for storage in gsc_connections.refresh_token_encrypted.
// Output is a single base64 string: iv (12 bytes) + authTag (16 bytes) + ciphertext.
function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

function decrypt(payload) {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
