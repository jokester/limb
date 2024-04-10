import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from './workerApp';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {wait} from '@jokester/ts-commonutil/lib/concurrency/timing';
import * as sio from 'socket.io';
import type * as eio from 'engine.io';
import {EventEmitter} from 'node:events';

declare const self: CF.ServiceWorkerGlobalScope;
const {Response, fetch, addEventListener, WebSocketPair} = self;

// @ts-ignore
class FakeEngine
  extends EventEmitter
  implements InstanceType<typeof eio.BaseServer>
{
  constructor(readonly opts?: eio.ServerOptions) {
    super();
  }
}

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

  readonly x = lazy(() => {
    const server = new sio.Server({
      transports: ['websocket'],
    });
    server.bind();
  });

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
