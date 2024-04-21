import type * as CF from '@cloudflare/workers-types';
import {ActorMethodMap, buildSend} from './utils/send';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {createDebugLogger} from './utils/logger';

const debugLogger = createDebugLogger('sio-worker:SioActor');

interface Methods extends ActorMethodMap {
  onConnection(sid: string, connParent: CF.DurableObjectId): {message: string};
}

/**
 * works like a sio.Server
 */
export class SioActor implements CF.DurableObject {
  static readonly send = buildSend<Methods>();

  readonly server = lazy(() =>
    new Hono().post('/onConnection', async ctx => {
      const [sid, connParent]: Parameters<Methods['onConnection']> =
        await ctx.req.json();

      debugLogger('onConnection', sid, connParent);

      return ctx.json({message: 'got sid'});
    })
  );

  async fetch(request: CF.Request): Promise<CF.Response> {
    debugLogger('fetch', request);
    // @ts-expect-error
    return this.server.value.fetch(request);
  }
}
