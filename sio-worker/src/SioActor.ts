import type * as CF from '@cloudflare/workers-types';
import {ActorMethodMap, buildSend} from './utils/send';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {createDebugLogger} from './utils/logger';
import {Socket as EioSocket} from 'engine.io/lib/socket'
import {Server as BaseSioServer } from 'socket.io/lib/index'

const debugLogger = createDebugLogger('sio-worker:SioActor');

interface Methods extends ActorMethodMap {
  onConnection(sid: string, sender: CF.DurableObjectId): unknown;

  onConnectionClose(sid: string, sender: CF.DurableObjectId): unknown;

  onConnectionError(sid: string, sender: CF.DurableObjectId): unknown;

  onMessage(sid: string, sender: CF.DurableObjectId, data: string | Buffer): void;
}

class MockSocket implements InstanceType<typeof EioSocket> {
  // TODO
  // event emitter + writable interface for this DO
}

class SioServer extends BaseSioServer {
  constructor() {
    // TODO
    super({});
  }
}

/**
 * works like a sio.Server
 */
export class SioActor implements CF.DurableObject {
  static readonly send = buildSend<Methods>();

  readonly server = lazy(() =>
    new Hono().post('/onConnection', async ctx => {
      const [sid, sender]: Parameters<Methods['onConnection']> =
        await ctx.req.json();

      debugLogger('onConnection', sid, sender);

      return ctx.json({message: 'got sid'});
    }).post('/onMessage', async ctx => {
      const [sid, sender, data]: Parameters<Methods['onMessage']> =
        await ctx.req.json();

      debugLogger('onMessage', sid, sender, data);
    }).post('/onConnectionClose', async ctx => {
      const [sid, sender]: Parameters<Methods['onConnectionClose']> =
        await ctx.req.json();

      debugLogger('onConnectionClose', sid, sender);
    }).post('/onConnectionError', async ctx => {
      const [sid, sender]: Parameters<Methods['onConnectionError']> =
        await ctx.req.json();

      debugLogger('onConnectionError', sid, sender);
    })
  );

  async fetch(request: CF.Request): Promise<CF.Response> {
    // debugLogger('fetch', request);
    // @ts-expect-error
    return this.server.value.fetch(request);
  }
}
