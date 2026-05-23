import 'dotenv/config';
import crypto from 'crypto';

const masterKey = process.env.MASTER_KEY;

// 1. Validate for presence of MASTER_KEY
if (!masterKey) {
  console.error("FATAL ERROR: MASTER_KEY is not defined in environment variables. Server shutting down.");
  process.exit(1);
}

// 2. Validate that it's a valid hexadecimal string
const isHex = /^[0-9a-fA-F]{64}$/.test(masterKey);
if (!isHex) {
  console.error("FATAL ERROR: MASTER_KEY must be a valid 64-character hexadecimal string. Server shutting down.");
  process.exit(1);
}

// 3. Validate for 256-bit entropy (must parse to exactly 32 bytes)
const keyBuffer = Buffer.from(masterKey, 'hex');
if (keyBuffer.length !== 32) {
  console.error(`FATAL ERROR: MASTER_KEY must have exactly 256 bits of entropy (decoded length: ${keyBuffer.length} bytes). Server shutting down.`);
  process.exit(1);
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * The output format is: iv_hex:auth_tag_hex:ciphertext_hex
 */
export function encrypt(plaintext: string): string {
  if (typeof plaintext !== 'string') {
    return plaintext;
  }
  
  const iv = crypto.randomBytes(12); // Standard IV size for GCM is 12 bytes
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string (iv_hex:auth_tag_hex:ciphertext_hex) using AES-256-GCM.
 */
export function decrypt(ciphertext: string): string {
  if (typeof ciphertext !== 'string') {
    return ciphertext;
  }
  
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // If not in standard encrypted format, return as-is (useful for initial migration or unencrypted seeding)
    return ciphertext;
  }
  
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText).toString('utf8');
    decrypted += decipher.final().toString('utf8');
    
    return decrypted;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Decryption failed:', msg);
    throw new Error('Failed to decrypt data: potential integrity violation or invalid key.');
  }
}
