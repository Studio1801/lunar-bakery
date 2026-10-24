import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ApiRequest extends IncomingMessage {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
}

export interface ApiResponse extends ServerResponse {
  status(code: number): this;
  json(body: unknown): this;
}

export function readBody(request: ApiRequest): Record<string, unknown> {
  if (request.body && typeof request.body === 'object') {
    return request.body as Record<string, unknown>;
  }
  if (typeof request.body === 'string') {
    try {
      const parsed: unknown = JSON.parse(request.body);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export function methodNotAllowed(response: ApiResponse, allowed: string[]) {
  response.setHeader('Allow', allowed.join(', '));
  return response.status(405).json({ error: 'Method not allowed' });
}
