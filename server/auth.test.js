import test from 'node:test';
import assert from 'node:assert/strict';
import { constantTimeEqual, createSessionToken, verifySessionToken } from './auth.js';

const secret = 'test-session-secret-that-is-long-enough-for-tests';
const now = Date.UTC(2026, 0, 1);

test('constantTimeEqual compares access codes without case folding', () => {
  assert.equal(constantTimeEqual('intelpro', 'intelpro'), true);
  assert.equal(constantTimeEqual('intelpro', 'Intelpro'), false);
  assert.equal(constantTimeEqual('intelpro', 'inteladmin100'), false);
});

test('session token preserves its role and expires after twelve hours', () => {
  const token = createSessionToken('admin', secret, now);
  assert.deepEqual(verifySessionToken(token, secret, now), {
    role: 'admin',
    expiresAt: Math.floor(now / 1000) + 60 * 60 * 12,
  });
  assert.equal(verifySessionToken(token, secret, now + 12 * 60 * 60 * 1000), null);
});

test('session token rejects tampering and a different signing secret', () => {
  const token = createSessionToken('viewer', secret, now);
  const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
  assert.equal(verifySessionToken(tampered, secret, now), null);
  assert.equal(verifySessionToken(token, `${secret}-different`, now), null);
});

test('session token only issues supported roles', () => {
  assert.throws(() => createSessionToken('owner', secret, now), /Invalid session role/);
});
