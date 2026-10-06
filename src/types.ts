export type AnomalyType =
  | 'SLOW_REQUEST'
  | 'CLIENT_ERROR'
  | 'SERVER_ERROR'
  | 'ABORTED'
  | 'OVERSIZED_PAYLOAD';

export type AnomalySeverity = 'low' | 'medium' | 'high';

export interface HttpAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
}

export interface HttpDiagnosticEvent {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  path: string;
  statusCode: number;
  durationMs: number;
  requestSize: number;
  responseSize: number;
  clientIp?: string;
  userAgent?: string;
  headers?: Record<string, string>;
  anomalies: HttpAnomaly[];
}

export type DiagnosticLogger = (event: HttpDiagnosticEvent) => void;

export interface MiddlewareOptions {
  /**
   * Request duration in ms that triggers a SLOW_REQUEST anomaly (default: 1000ms).
   */
  slowThresholdMs?: number;
  /**
   * Maximum payload size in bytes that triggers OVERSIZED_PAYLOAD anomaly (default: 5MB).
   */
  maxPayloadBytes?: number;
  /**
   * Header to read/write request ID (default: 'x-request-id').
   */
  requestIdHeader?: string;
  /**
   * Custom request ID generator.
   */
  generateRequestId?: () => string;
  /**
   * Header names to sanitize/redact as '***[REDACTED]***'.
   */
  redactedHeaders?: string[];
  /**
   * URL query parameter keys to sanitize/redact.
   */
  redactedQueryParams?: string[];
  /**
   * Whether to capture and include request headers in the event (default: true).
   */
  includeHeaders?: boolean;
  /**
   * Diagnostic event sink:
   * - 'json': prints JSON string to process.stdout
   * - 'none': does not emit to stdout
   * - function: custom callback handler
   */
  onEvent?: DiagnosticLogger | 'json' | 'none';
}
