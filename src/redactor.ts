const DEFAULT_SENSITIVE_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'api-key',
  'x-auth-token',
  'session-token',
  'x-csrf-token',
]);

const DEFAULT_SENSITIVE_QUERY_PARAMS = new Set([
  'token',
  'secret',
  'password',
  'pass',
  'key',
  'apikey',
  'api_key',
  'auth',
  'access_token',
  'refresh_token',
]);

const REDACTED_VALUE = '***[REDACTED]***';

export function sanitizeHeaders(
  headers: Record<string, any>,
  customSensitiveHeaders?: string[]
): Record<string, string> {
  const sensitive = new Set([...DEFAULT_SENSITIVE_HEADERS]);
  if (customSensitiveHeaders) {
    for (const h of customSensitiveHeaders) {
      sensitive.add(h.toLowerCase());
    }
  }

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (sensitive.has(lowerKey)) {
      sanitized[lowerKey] = REDACTED_VALUE;
    } else {
      sanitized[lowerKey] = String(value);
    }
  }
  return sanitized;
}

export function sanitizeUrl(
  rawUrl: string,
  customSensitiveParams?: string[]
): { sanitizedUrl: string; path: string } {
  try {
    // If relative url, prepend dummy origin for URL parser
    const parsed = new URL(rawUrl, 'http://localhost');
    const sensitive = new Set([...DEFAULT_SENSITIVE_QUERY_PARAMS]);
    if (customSensitiveParams) {
      for (const p of customSensitiveParams) {
        sensitive.add(p.toLowerCase());
      }
    }

    const searchParams = parsed.searchParams;
    let modified = false;

    const keys = Array.from(searchParams.keys());
    for (const key of keys) {
      if (sensitive.has(key.toLowerCase())) {
        searchParams.set(key, REDACTED_VALUE);
        modified = true;
      }
    }

    const path = parsed.pathname;
    const query = decodeURIComponent(searchParams.toString());
    const sanitizedUrl = query ? `${path}?${query}` : path;

    return { sanitizedUrl, path };
  } catch {
    return { sanitizedUrl: rawUrl, path: rawUrl.split('?')[0] };
  }
}
