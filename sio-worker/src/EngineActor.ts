import {
  DurableObject,
  Request,
  Response,
  WebSocket,
  WebSocketEventMap,
  WebSocketPair,
} from '@cloudflare/workers-types';

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
