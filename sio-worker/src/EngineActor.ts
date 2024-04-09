import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from './workerApp';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';

declare const self: CF.ServiceWorkerGlobalScope;
const {Response, fetch, addEventListener, WebSocketPair} = self;

/**
 * HTTP + WS handler
 */
export class EngineActor implements CF.DurableObject {
  constructor(
    private state: CF.DurableObjectState,
    private readonly env: WorkerBindings
  ) {}

  readonly honoApp = lazy(() =>
    new Hono<WorkerBindings>().get('/*', async ctx => {
      if (ctx.req.header('Upgrade') !== 'websocket') {
        return new Response(null, {
          status: 400,
          statusText: 'Not a Upgrade request',
        });
      }

      const pair = new WebSocketPair();

      this.state.acceptWebSocket(pair[1]);

      return new Response(null, {status: 101, webSocket: pair[0]});
    })
  );

  fetch(req: Request): Response | Promise<Response> {
    const {value: app} = this.honoApp;
    return app.fetch(req, this.env);
  }
}
