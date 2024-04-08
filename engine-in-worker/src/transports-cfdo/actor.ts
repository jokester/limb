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
class Actor implements DurableObject {
  async fetch(request: Request) {
    const response = new Response(JSON.stringify({hello: 'world'}), {
      status: 200,
    });
    return response;
  }
}

export default new Actor();
