import type * as CF from '@cloudflare/workers-types';
import {ActorMethodMap, buildSend} from './utils/send';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {createDebugLogger} from './utils/logger';

const debugLogger = createDebugLogger('sio-worker:SioActor');

interface Methods extends ActorMethodMap {
  onConnection(sid: string, connParent: CF.DurableObjectId): void;
}

/**
 * works like a sio.Server
 */
export class SioActor implements CF.DurableObject {
  static readonly send = buildSend<Methods>();

  server = lazy(() => new Hono());

  async fetch(request: Request): Promise<Response> {
    debugLogger('fetch', request);
    return new Response('not found', {status: 404});
  }
}
