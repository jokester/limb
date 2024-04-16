import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from './workerApp';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {wait} from '@jokester/ts-commonutil/lib/concurrency/timing';
import type * as eio from 'engine.io';
import {EventEmitter} from 'node:events';
import {BaseServer as EioBaseServer} from 'engine.io';
import {WebSocket as EioWebSocket} from 'engine.io/lib/transports/websocket';
import {Deferred} from '@jokester/ts-commonutil/lib/concurrency/deferred';

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

export interface EngineActorMethods {}

class DoWebSocket extends EioWebSocket {}

class EioServer extends EioBaseServer {
  constructor() {
    super({
      transports: ['do-ws'],
    });
  }
  init() {}

  cleanup() {}

  protected createTransport(transportName: any, req: any): any {
    if (transportName !== 'websocket') {
      throw new Error('should not be here');
    }
  }

  async onWebsocket(ws: CF.WebSocket): Promise<void> {
    const fail = new Deferred<unknown>();

    const t: EioWebSocket = await this.handshake(
      'websocket',
      {
        query: {
          EIO: '4',
          websocket: ws,
        },
      },
      (errCode, errContext) => fail.reject(new Error(errCode))
    );
    if (fail.resolved) {
      await fail;
    }
  }
}

/**
 * WS handler based on engine.io
 */
export class EngineActor implements CF.DurableObject {
  static call(state: CF.DurableObjectState, env: WorkerBindings) {
    return new EngineActor(state, env);
  }
  constructor(
    private state: CF.DurableObjectState,
    private readonly env: WorkerBindings
  ) {}

  readonly eioServer = lazy(() => {
    const s = new EioServer();
    s.on('connection', socket => {
      // TODO: propagate to sio.Server equivalent
    });
    return s
  });

  readonly honoApp = lazy(() =>
    new Hono<{Bindings: WorkerBindings}>().get('/*', async ctx => {
      if (ctx.req.header('Upgrade') !== 'websocket') {
        return new Response(null, {
          status: 426,
          statusText: 'Not a Upgrade request',
        });
      }

      const {0: client, 1: server} = new WebSocketPair();

      this.state.acceptWebSocket(server);
      server.accept();

      this.eioServer.value.onWebsocket(server)

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
