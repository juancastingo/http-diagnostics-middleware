import crypto from 'node:crypto';
import {
  HttpDiagnosticEvent,
  HttpAnomaly,
  MiddlewareOptions,
} from './types.js';
import { sanitizeHeaders, sanitizeUrl } from './redactor.js';

export function evaluateAnomalies(
  statusCode: number,
  durationMs: number,
  requestSize: number,
  responseSize: number,
  aborted: boolean,
  options: MiddlewareOptions
): HttpAnomaly[] {
  const anomalies: HttpAnomaly[] = [];
  const slowThreshold = options.slowThresholdMs ?? 1000;
  const maxPayload = options.maxPayloadBytes ?? 5 * 1024 * 1024;

  if (aborted) {
    anomalies.push({
      type: 'ABORTED',
      severity: 'high',
      description: 'Client connection closed or aborted before response completion',
    });
  }

  if (statusCode >= 500) {
    anomalies.push({
      type: 'SERVER_ERROR',
      severity: 'high',
      description: `Internal server error HTTP ${statusCode}`,
    });
  } else if (statusCode >= 400) {
    anomalies.push({
      type: 'CLIENT_ERROR',
      severity: 'medium',
      description: `Client request error HTTP ${statusCode}`,
    });
  }

  if (durationMs > slowThreshold) {
    anomalies.push({
      type: 'SLOW_REQUEST',
      severity: durationMs > slowThreshold * 3 ? 'high' : 'medium',
      description: `Request latency (${durationMs.toFixed(1)}ms) exceeded slow threshold (${slowThreshold}ms)`,
    });
  }

  if (requestSize > maxPayload || responseSize > maxPayload) {
    anomalies.push({
      type: 'OVERSIZED_PAYLOAD',
      severity: 'medium',
      description: `Payload size exceeded threshold (req: ${requestSize}B, res: ${responseSize}B, max: ${maxPayload}B)`,
    });
  }

  return anomalies;
}

export function buildDiagnosticEvent(params: {
  id: string;
  method: string;
  rawUrl: string;
  statusCode: number;
  durationMs: number;
  requestSize: number;
  responseSize: number;
  clientIp?: string;
  userAgent?: string;
  rawHeaders?: Record<string, any>;
  aborted: boolean;
  options: MiddlewareOptions;
}): HttpDiagnosticEvent {
  const { sanitizedUrl, path } = sanitizeUrl(
    params.rawUrl,
    params.options.redactedQueryParams
  );

  const headers =
    params.options.includeHeaders !== false && params.rawHeaders
      ? sanitizeHeaders(params.rawHeaders, params.options.redactedHeaders)
      : undefined;

  const anomalies = evaluateAnomalies(
    params.statusCode,
    params.durationMs,
    params.requestSize,
    params.responseSize,
    params.aborted,
    params.options
  );

  return {
    id: params.id,
    timestamp: new Date().toISOString(),
    method: params.method.toUpperCase(),
    url: sanitizedUrl,
    path,
    statusCode: params.statusCode,
    durationMs: Number(params.durationMs.toFixed(2)),
    requestSize: params.requestSize,
    responseSize: params.responseSize,
    clientIp: params.clientIp,
    userAgent: params.userAgent,
    headers,
    anomalies,
  };
}

export function emitEvent(event: HttpDiagnosticEvent, options: MiddlewareOptions): void {
  const sink = options.onEvent ?? 'json';

  if (typeof sink === 'function') {
    sink(event);
  } else if (sink === 'json') {
    process.stdout.write(JSON.stringify(event) + '\n');
  }
}

export function generateDefaultId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
