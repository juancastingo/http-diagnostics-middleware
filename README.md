# @juancastingo/http-diagnostics-middleware

[![CI](https://github.com/juancastingo/http-diagnostics-middleware/actions/workflows/ci.yml/badge.svg)](https://github.com/juancastingo/http-diagnostics-middleware/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@juancastingo/http-diagnostics-middleware.svg)](https://www.npmjs.com/package/@juancastingo/http-diagnostics-middleware)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg)](https://www.typescriptlang.org/)

Zero-overhead HTTP diagnostics and observability middleware for **Express** and **Fastify** applications.

Track request/response timings with nanosecond precision, measure payload sizes, trace request IDs, identify client disconnects, and **automatically flag runtime anomalies and redact secrets** before logs reach your monitoring platform.

---

## Features

- ⏱️ **Nanosecond Latency Waterfalls**: Precise timing calculated via `process.hrtime.bigint()`.
- 🆔 **Request ID Lifecycle**: Auto-generates or propagates `x-request-id` headers through requests and responses.
- 📊 **Payload Byte Auditing**: Captures ingress content lengths and stream-level egress response byte counts.
- 🚨 **Automated Anomaly Detection**:
  - `SLOW_REQUEST`: Flag requests exceeding SLA latency thresholds.
  - `SERVER_ERROR` & `CLIENT_ERROR`: Categorize 4xx and 5xx anomalies.
  - `ABORTED`: Identify client disconnects before response completion.
  - `OVERSIZED_PAYLOAD`: Alert on abnormally large ingress or egress data transfers.
- 🔒 **Zero-Leakage Sanitization**: Automatically masks `Authorization`, `Cookie`, `X-Api-Key` headers and sensitive query parameters (`token`, `secret`, `password`, `apiKey`) as `***[REDACTED]***`.
- 🚀 **Zero Required Runtime Dependencies**: Pure Node.js standard library implementation.

---

## Installation

```bash
npm install @juancastingo/http-diagnostics-middleware
# or
pnpm add @juancastingo/http-diagnostics-middleware
# or
yarn add @juancastingo/http-diagnostics-middleware
```

---

## Usage with Express

```typescript
import express from 'express';
import { expressDiagnostics } from '@juancastingo/http-diagnostics-middleware';

const app = express();

// Register middleware early in your pipeline
app.use(
  expressDiagnostics({
    slowThresholdMs: 500, // Flag requests taking longer than 500ms
    onEvent: (event) => {
      // Send directly to Datadog, CloudWatch, OpenTelemetry, or stdout
      if (event.anomalies.length > 0) {
        console.warn(`[HTTP ANOMALY] ${event.method} ${event.path}:`, event.anomalies);
      }
    },
  })
);

app.get('/api/users', (req, res) => {
  res.json({ users: ['alice', 'bob'] });
});

app.listen(3000);
```

---

## Usage with Fastify

```typescript
import Fastify from 'fastify';
import { fastifyDiagnostics } from '@juancastingo/http-diagnostics-middleware';

const fastify = Fastify();

fastify.register(fastifyDiagnostics, {
  slowThresholdMs: 300,
  onEvent: 'json', // Stream structured JSON directly to stdout
});

fastify.get('/ping', async () => ({ status: 'ok' }));

fastify.listen({ port: 3000 });
```

---

## Example Structured Diagnostic Event

```json
{
  "id": "e0a29486-639a-42c2-80ba-38aef726a760",
  "timestamp": "2026-10-06T15:30:00.120Z",
  "method": "POST",
  "url": "/api/checkout?token=***[REDACTED]***&plan=enterprise",
  "path": "/api/checkout",
  "statusCode": 500,
  "durationMs": 842.15,
  "requestSize": 1024,
  "responseSize": 45,
  "clientIp": "203.0.113.195",
  "userAgent": "Mozilla/5.0 ...",
  "headers": {
    "host": "api.production.internal",
    "authorization": "***[REDACTED]***",
    "x-api-key": "***[REDACTED]***",
    "content-type": "application/json"
  },
  "anomalies": [
    {
      "type": "SLOW_REQUEST",
      "severity": "medium",
      "description": "Request latency (842.2ms) exceeded slow threshold (500ms)"
    },
    {
      "type": "SERVER_ERROR",
      "severity": "high",
      "description": "Internal server error HTTP 500"
    }
  ]
}
```

---

## Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `slowThresholdMs` | `number` | `1000` | Latency threshold triggering `SLOW_REQUEST` |
| `maxPayloadBytes`| `number` | `5242880` (5MB) | Payload limit triggering `OVERSIZED_PAYLOAD` |
| `requestIdHeader`| `string` | `'x-request-id'`| Request ID header name |
| `generateRequestId` | `() => string` | `crypto.randomUUID` | Custom ID generator |
| `redactedHeaders`| `string[]`| `['authorization', 'cookie', ...]` | Additional headers to sanitize |
| `redactedQueryParams` | `string[]` | `['token', 'secret', ...]` | Additional query parameters to mask |
| `onEvent` | `'json' \| 'none' \| function` | `'json'` | Event destination handler |

---

## License

MIT License © 2026 Juan Castin
