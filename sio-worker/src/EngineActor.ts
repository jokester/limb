import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from './workerApp';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import type * as eio from 'engine.io';
import {BaseServer as EioBaseServer} from 'engine.io/lib/server';
import {WebSocket as EioWebSocket} from 'engine.io/lib/transports/websocket';
import {Deferred} from '@jokester/ts-commonutil/lib/concurrency/deferred';
import {SioActor} from './SioActor';
import {ActorMethodMap, buildSend} from './utils/send';

declare const self: CF.ServiceWorkerGlobalScope;

interface Methods extends ActorMethodMap {
  send(sid: string, msg: string | Buffer): void;
  close(sid: string, cause?: any): void;
}

class EioServer extends EioBaseServer {
  constructor() {
    super({
      transports: ['websocket'],
    });
  }
  init() {}

  cleanup() {}

  protected createTransport(transportName: string, req: any): EioWebSocket {
    if (transportName !== 'websocket') {
      throw new Error('should not be here');
    }
    return new EioWebSocket(req);
  }

  /**
   * works like eio.Server#onWebSocket(req, socket, websocket) but
   * - no middleware or verify yet
   * @param ws
   */
  async onCfSocket(ws: CF.WebSocket): Promise<void> {
    const fail = new Deferred<unknown>();

    /**
     * inside this.handshake():
     * 1. create (or reuse)
     */
    const t: EioWebSocket = await this.handshake(
      'websocket',
      {
        query: {
          // FIXME: find a way to reuse sid across WS connections. handshake() always create a new sid.
          sid: '',
          EIO: '4',
        },
        websocket: ws,
      },
      (errCode: string, errContext: unknown) => fail.reject(new Error(errCode))
    );
    if (fail.resolved) {
      await fail; // to throw
    }
    // else: a Socket object should be emitted in `this.handshake()` call
  }
}

/**
 * WS based on engine.io
 * - keeps transport : TS = eio.Socket + eio.WebSocket
 * - emits id of new connected Socket (to who?)
 * - emits messages
 * - forwards message to Socket
 */
export class EngineActor implements CF.DurableObject {
  static readonly send = buildSend<Methods>();

  constructor(
    private state: CF.DurableObjectState,
    private readonly env: WorkerBindings
  ) {}

  readonly eioServer = lazy(() => {
    const s = new EioServer();
    s.on('connection', (socket: eio.Socket) => this.onEioSocket(socket));
    return s;
  });

  private onEioSocket(socket: eio.Socket) {
    // @ts-ignore
    const sid: string = socket.id;
    const destId = this.env.sioActor.idFromName('singleton');
    SioActor.send(
      {
        kind: this.env.sioActor,
        id: destId,
      },
      {
        method: 'onConnection',
        params: [sid, this.state.id],
      },
      this.state.id
    );
  }

  readonly honoApp = lazy(() =>
    new Hono<{Bindings: WorkerBindings}>().get('/*', async ctx => {
      if (ctx.req.header('Upgrade') !== 'websocket') {
        return new Response(null, {
          status: 426,
          statusText: 'Not a Upgrade request',
        });
      }

      const {0: clientSocket, 1: serverSocket} = new self.WebSocketPair();
      // TODO: if req contains a Engine.io sid, should query engine.io server to follow the protocol

      this.state.acceptWebSocket(serverSocket);
      // serverSocket.accept();

      await this.eioServer.value.onCfSocket(serverSocket);

      return new self.Response(null, {status: 101, webSocket: clientSocket});
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
