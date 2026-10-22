import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signature(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export function constantTimeEqual(left, right) {
  const leftHash = createHmac('sha256', 'intelasist-access-code').update(String(left)).digest();
  const rightHash = createHmac('sha256', 'intelasist-access-code').update(String(right)).digest();
  return timingSafeEqual(leftHash, rightHash);
}

export function createSessionToken(role, secret, now = Date.now()) {
  if (role !== 'viewer' && role !== 'admin') {
    throw new Error('Invalid session role.');
  }
  const issuedAt = Math.floor(now / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({
    role,
    iat: issuedAt,
    exp: issuedAt + SESSION_LIFETIME_SECONDS,
  }));
  const content = `${header}.${payload}`;
  return `${content}.${signature(content, secret)}`;
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, providedSignature] = parts;
  const content = `${encodedHeader}.${encodedPayload}`;
  if (!constantTimeEqual(signature(content, secret), providedSignature)) return null;

  try {
    const header = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    const nowSeconds = Math.floor(now / 1000);
    if (
      header.alg !== 'HS256'
      || (payload.role !== 'viewer' && payload.role !== 'admin')
      || !Number.isInteger(payload.exp)
      || payload.exp <= nowSeconds
      || !Number.isInteger(payload.iat)
      || payload.iat > nowSeconds + 60
    ) {
      return null;
    }
    return { role: payload.role, expiresAt: payload.exp };
  } catch {
    return null;
  }
}
