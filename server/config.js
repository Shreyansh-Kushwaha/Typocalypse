import crypto from 'crypto';
import dotenv from 'dotenv';

// Imports are hoisted, so this module can run before index.js calls
// dotenv.config() - load the env here to be safe (idempotent).
dotenv.config();

// Central config with fail-fast checks. Never ship the old hardcoded fallback.
const isProduction = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProduction) {
    console.error('❌ FATAL: JWT_SECRET is not set. Refusing to start in production.');
    process.exit(1);
  }
  // Dev convenience: a random per-boot secret. Tokens die on restart, but
  // nobody can forge one with a known string.
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('⚠ JWT_SECRET not set - using a random per-boot secret (dev only). Set JWT_SECRET in .env.');
}

export const JWT_SECRET = jwtSecret;

// Comma-separated allowlist, e.g. "https://typocalypse.app,https://www.typocalypse.app"
const allowlist = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

export function corsOrigin(origin, callback) {
  // No Origin header: same-origin, curl, server-to-server - allow.
  if (!origin) return callback(null, true);
  if (allowlist.length > 0) {
    return callback(null, allowlist.includes(origin));
  }
  if (!isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return callback(null, true);
  }
  if (isProduction) {
    console.warn(`CORS: rejected origin ${origin} - set CORS_ORIGIN to allow it`);
    return callback(null, false);
  }
  // Dev with no allowlist: permissive so codespace/preview URLs work.
  return callback(null, true);
}
