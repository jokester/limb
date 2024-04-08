import type {
  DurableObject,
  Request,
  // @ts-ignore
  Response,
  WebSocket,
  WebSocketEventMap,
  WebSocketPair,
  ServiceWorkerGlobalScope,
} from '@cloudflare/workers-types';

declare const self: ServiceWorkerGlobalScope;
const {Response, fetch, addEventListener} = self;
/**
 * HTTP + WS handler
 */
export class EngineActor implements DurableObject {
  async fetch(request: Request) {
    const response = new Response(JSON.stringify({hello: 'world'}), {
      status: 200,
    });
    return response;
  }
}
