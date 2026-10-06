import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {
  sanitizeHeaders,
  sanitizeUrl,
  evaluateAnomalies,
  expressDiagnostics,
  HttpDiagnosticEvent,
} from '../src/index.js';

test('sanitizeHeaders masks sensitive authentication and token headers', () => {
  const headers = {
    host: 'api.example.com',
    authorization: 'Bearer super-secret-jwt-token',
    cookie: 'session_id=12345; auth=xyz',
    'x-api-key': 'live_key_9999',
    'content-type': 'application/json',
  };

  const sanitized = sanitizeHeaders(headers);
  assert.equal(sanitized.host, 'api.example.com');
  assert.equal(sanitized['content-type'], 'application/json');
  assert.equal(sanitized.authorization, '***[REDACTED]***');
  assert.equal(sanitized.cookie, '***[REDACTED]***');
  assert.equal(sanitized['x-api-key'], '***[REDACTED]***');
});

test('sanitizeUrl masks sensitive query parameters in URL', () => {
  const url = '/api/v1/checkout?token=secret123&user=john&apiKey=key999&page=1';
  const { sanitizedUrl, path } = sanitizeUrl(url);

  assert.equal(path, '/api/v1/checkout');
  assert.ok(sanitizedUrl.includes('user=john'));
  assert.ok(sanitizedUrl.includes('page=1'));
  assert.ok(sanitizedUrl.includes('token=***[REDACTED]***'));
  assert.ok(!sanitizedUrl.includes('secret123'));
  assert.ok(!sanitizedUrl.includes('key999'));
});

test('evaluateAnomalies flags errors and high latencies', () => {
  const anomalies = evaluateAnomalies(500, 1500, 100, 500, false, {
    slowThresholdMs: 1000,
  });

  const types = anomalies.map((a) => a.type);
  assert.ok(types.includes('SERVER_ERROR'));
  assert.ok(types.includes('SLOW_REQUEST'));
});

test('expressDiagnostics middleware captures timing, payload sizes, and emits event', async () => {
  let capturedEvent: HttpDiagnosticEvent | null = null;

  const middleware = expressDiagnostics({
    onEvent: (event) => {
      capturedEvent = event;
    },
    slowThresholdMs: 50,
  });

  const server = http.createServer((req, res) => {
    middleware(req, res, () => {
      setTimeout(() => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'hello world' }));
      }, 70); // will trigger slow request anomaly
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as any;
  const port = address.port;

  // Perform HTTP client request
  const responseData = await new Promise<string>((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}/test/path?foo=bar`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });

  assert.match(responseData, /"status":"ok"/);

  // Close server
  await new Promise<void>((resolve) => server.close(() => resolve()));

  // Wait a tick for event emit
  await new Promise((r) => setTimeout(r, 20));

  assert.ok(capturedEvent);
  assert.equal(capturedEvent.method, 'GET');
  assert.equal(capturedEvent.path, '/test/path');
  assert.equal(capturedEvent.statusCode, 200);
  assert.ok(capturedEvent.durationMs >= 60);
  assert.ok(capturedEvent.responseSize > 0);
  assert.ok(capturedEvent.id);

  const slowAnomaly = capturedEvent.anomalies.find((a) => a.type === 'SLOW_REQUEST');
  assert.ok(slowAnomaly);
});
