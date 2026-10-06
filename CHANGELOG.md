# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-06

### Added
- Initial public release of `@juancastingo/http-diagnostics-middleware`.
- High-precision latency measurement via `process.hrtime.bigint()`.
- Request ID propagation via `x-request-id` with custom ID generators.
- Real-time payload size accounting (request body length and response stream bytes).
- Automated anomaly detection:
  - `SLOW_REQUEST`: Latency exceeding configurable threshold.
  - `SERVER_ERROR` & `CLIENT_ERROR`: HTTP 5xx and 4xx status detection.
  - `ABORTED`: Premature client disconnects before stream finish.
  - `OVERSIZED_PAYLOAD`: Excessive request or response payloads.
- Automatic secret sanitization for authorization headers, cookies, API keys, and URL query strings.
- Express and Fastify framework integration.
- Configurable event sink (structured JSON stdout or custom `onEvent` callback).
