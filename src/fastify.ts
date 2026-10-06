import { MiddlewareOptions, HttpDiagnosticEvent } from './types.js';
import { buildDiagnosticEvent, emitEvent, generateDefaultId } from './collector.js';

export function fastifyDiagnostics(fastify: any, options: MiddlewareOptions = {}, done: () => void) {
  const reqIdHeader = (options.requestIdHeader || 'x-request-id').toLowerCase();

  fastify.addHook('onRequest', (request: any, reply: any, next: () => void) => {
    (request.raw as any).__startTime = process.hrtime.bigint();

    let reqId = request.headers[reqIdHeader];
    if (!reqId) {
      reqId = options.generateRequestId ? options.generateRequestId() : generateDefaultId();
      request.headers[reqIdHeader] = reqId;
    }
    reply.header(reqIdHeader, reqId);
    next();
  });

  fastify.addHook('onResponse', (request: any, reply: any, next: () => void) => {
    const startTime = (request.raw as any).__startTime || process.hrtime.bigint();
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const reqId = request.headers[reqIdHeader] || request.id || generateDefaultId();
    const reqSize = parseInt(request.headers['content-length'] || '0', 10) || 0;
    const resSize = parseInt(reply.getHeader('content-length') || '0', 10) || 0;

    const event = buildDiagnosticEvent({
      id: reqId,
      method: request.method,
      rawUrl: request.url,
      statusCode: reply.statusCode,
      durationMs,
      requestSize: reqSize,
      responseSize: resSize,
      clientIp: request.ip,
      userAgent: request.headers['user-agent'],
      rawHeaders: request.headers,
      aborted: false,
      options,
    });

    emitEvent(event, options);
    next();
  });

  if (typeof done === 'function') {
    done();
  }
}
