import { IncomingMessage, ServerResponse } from 'node:http';
import { MiddlewareOptions, HttpDiagnosticEvent } from './types.js';
import { buildDiagnosticEvent, emitEvent, generateDefaultId } from './collector.js';

export function expressDiagnostics(options: MiddlewareOptions = {}) {
  const reqIdHeader = (options.requestIdHeader || 'x-request-id').toLowerCase();

  return function httpDiagnosticsMiddleware(req: any, res: any, next: (err?: any) => void) {
    const startTime = process.hrtime.bigint();

    // 1. Resolve or assign request ID
    let requestId = req.headers[reqIdHeader] as string | undefined;
    if (!requestId) {
      requestId = options.generateRequestId ? options.generateRequestId() : generateDefaultId();
      req.headers[reqIdHeader] = requestId;
    }
    res.setHeader(reqIdHeader, requestId);

    // 2. Measure request payload size
    let reqSize = 0;
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const parsed = parseInt(contentLength, 10);
      if (!isNaN(parsed)) reqSize = parsed;
    }

    // 3. Track response bytes written
    let resSize = 0;
    const originalWrite = res.write;
    const originalEnd = res.end;

    res.write = function (chunk: any, ...args: any[]) {
      if (chunk) {
        resSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      return originalWrite.apply(res, [chunk, ...args]);
    };

    res.end = function (chunk: any, ...args: any[]) {
      if (chunk) {
        resSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
      }
      return originalEnd.apply(res, [chunk, ...args]);
    };

    let completed = false;

    function finishHandler(aborted: boolean) {
      if (completed) return;
      completed = true;

      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1_000_000;

      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        req.ip;

      const userAgent = req.headers['user-agent'];

      const event = buildDiagnosticEvent({
        id: requestId!,
        method: req.method || 'GET',
        rawUrl: req.originalUrl || req.url || '/',
        statusCode: res.statusCode || 200,
        durationMs,
        requestSize: reqSize,
        responseSize: resSize,
        clientIp,
        userAgent,
        rawHeaders: req.headers,
        aborted,
        options,
      });

      // Attach event to res.locals for downstream handlers
      if (res.locals) {
        res.locals.diagnosticEvent = event;
      }

      emitEvent(event, options);
    }

    res.on('finish', () => finishHandler(false));
    res.on('close', () => {
      if (!res.writableEnded) {
        finishHandler(true);
      }
    });

    next();
  };
}
