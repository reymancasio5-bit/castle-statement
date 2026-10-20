import test from 'node:test';
import assert from 'node:assert/strict';
import {webhookHeaders} from '../public/connection.js';

test('ngrok requests bypass its HTML warning while retaining webhook authentication', () => {
  const headers = webhookHeaders(new URL('https://example.ngrok-free.dev/webhook/data'), 'test-token');
  assert.equal(headers['ngrok-skip-browser-warning'], 'true');
  assert.equal(headers['X-Statement-Key'], 'test-token');
});

test('ordinary endpoints and lookalike domains do not receive the ngrok header', () => {
  for (const host of ['localhost:5678', 'n8n.example.com', 'example.ngrok-free.dev.attacker.test']) {
    assert.deepEqual(webhookHeaders(new URL(`https://${host}/webhook/data`), 'test-token'), {'X-Statement-Key': 'test-token'});
  }
});
