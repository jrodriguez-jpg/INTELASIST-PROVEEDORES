import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCors, readAllowedOrigins } from './cors.js';

const frontendOrigin = 'https://intelasist-proveedores.vercel.app';

test('reads the exact allowed frontend origin and legacy additional origins', () => {
  const origins = readAllowedOrigins({
    ALLOWED_ORIGIN: `${frontendOrigin}/`,
    APP_ORIGINS: 'https://preview.example.com, https://admin.example.com',
  });
  assert.deepEqual([...origins], [
    frontendOrigin,
    'https://preview.example.com',
    'https://admin.example.com',
  ]);
});

test('rejects invalid origins and URLs containing paths', () => {
  assert.throws(() => readAllowedOrigins({ ALLOWED_ORIGIN: 'not a URL' }));
  assert.throws(() => readAllowedOrigins({ ALLOWED_ORIGIN: 'https://example.com/app' }));
});

test('adds exact-origin preflight headers without enabling credentials', () => {
  const headers = new Map();
  const response = { setHeader: (key, value) => headers.set(key, value) };
  const request = {
    method: 'OPTIONS',
    headers: { origin: frontendOrigin },
  };

  assert.equal(applyCors(request, response, new Set([frontendOrigin])), true);
  assert.equal(headers.get('Access-Control-Allow-Origin'), frontendOrigin);
  assert.equal(headers.get('Access-Control-Allow-Methods'), 'GET, POST, PATCH, DELETE, OPTIONS');
  assert.equal(headers.get('Access-Control-Allow-Headers'), 'Authorization, Content-Type');
  assert.equal(headers.get('Access-Control-Allow-Credentials'), undefined);
  assert.equal(headers.get('Vary'), 'Origin');
});

test('does not grant CORS access to an unconfigured origin', () => {
  const headers = new Map();
  const response = { setHeader: (key, value) => headers.set(key, value) };
  const request = { headers: { origin: 'https://untrusted.example' } };

  assert.equal(applyCors(request, response, new Set([frontendOrigin])), false);
  assert.equal(headers.has('Access-Control-Allow-Origin'), false);
});

test('allows same-origin requests without adding the frontend to the CORS allowlist', () => {
  const headers = new Map();
  const response = { setHeader: (key, value) => headers.set(key, value) };
  const request = {
    headers: {
      origin: 'https://api.example.com',
      host: 'api.example.com',
      'x-forwarded-proto': 'https',
    },
  };

  assert.equal(applyCors(request, response, new Set()), true);
  assert.equal(headers.get('Access-Control-Allow-Origin'), 'https://api.example.com');
});
