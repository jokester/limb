import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from './workerApp';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {wait} from '@jokester/ts-commonutil/lib/concurrency/timing';

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
          status: 426,
          statusText: 'Not a Upgrade request',
        });
      }

      const {0: client, 1: server} = new WebSocketPair();

      this.state.acceptWebSocket(server);
      server.accept();

      setTimeout(async () => {
        for (let i = 0; i < 3; i++) {
          server.send(
            JSON.stringify({message: 'server sent', serverTime: Date.now()})
          );
          await wait(1e3);
        }
        server.close(1002, 'server close');
      });

      return new Response(null, {status: 101, webSocket: client});
    })
  );

  fetch(req: Request): Response | Promise<Response> {
    const {value: app} = this.honoApp;
    return app.fetch(req, this.env);
  }

  webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): void | Promise<void> {
    console.log('websocketClose', {
      ws,
      code,
      reason,
      wasClean,
    });
  }

  webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): void | Promise<void> {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
    ws.send(
      JSON.stringify({
        ...JSON.parse(message.toString()),
        serverTime: Date.now(),
      })
    );
  }

  webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
    console.log('websocket error', error);
  }
}
