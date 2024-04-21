import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from './workerApp';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import type * as eio from 'engine.io';
import {
  BaseServer as EioBaseServer,
  ErrorCallback as EioErrorCallback,
  PreparedIncomingMessage,
} from 'engine.io/lib/server';
import {
  WebSocket as EioWebSocketBase,
  DomWebSocket,
} from 'engine.io/lib/transports/websocket';
import {Deferred} from '@jokester/ts-commonutil/lib/concurrency/deferred';
import {SioActor} from './SioActor';
import {ActorMethodMap, buildSend} from './utils/send';
import {createDebugLogger} from './utils/logger';

declare const self: CF.ServiceWorkerGlobalScope;

const logger = createDebugLogger('sio-worker:EngineActor');

interface Methods extends ActorMethodMap {
  send(sid: string, msg: string | Buffer): void;
  close(sid: string, cause?: any): void;
}

function crateDummyRequest(
  cfWebSocket: CF.WebSocket,
  actor: EngineActor
): PreparedIncomingMessage {
  const wrapped: DomWebSocket = {
    _socket: {
      remoteAddress: 'FIXME: 127.0.0.1',
    },
    on(event: any, listener: any) {
      cfWebSocket.addEventListener(event, listener);
      return wrapped;
    },
    once(event: any, listener: any) {
      cfWebSocket.addEventListener(event, listener, {once: true});
      return wrapped;
    },
    send(data: string | Buffer, _opts?: unknown, _callback?: unknown) {
      cfWebSocket.send(data);
    },
    close: cfWebSocket.close.bind(cfWebSocket),
  };
  return {
    _query: {
      // FIXME: find a way to reuse sid across WS connections. handshake() always create a new sid.
      sid: '',
      EIO: '4',
    },
    websocket: wrapped,
  };
}

class EioWebSocket extends EioWebSocketBase {
  $$constructor(req: any, websocket: CF.WebSocket, actor: EngineActor) {
    // super({ ...req, websocket: createDomWebSocketMock(websocket, actor), });
  }
}

class EioServer extends EioBaseServer {
  constructor(private readonly actor: EngineActor) {
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
  async onCfSocket(ws: CF.WebSocket): Promise<unknown> {
    const handShaken = new Deferred<unknown>();

    const onHandshakeError: EioErrorCallback = (errCode, errContext) =>
      handShaken.reject(new Error(`${errContext?.message} : ${errCode}`));

    /**
     * inside this.handshake():
     * 1. create eio.WebSocket transfer and eio.Socket wrapping it
     */
    const t: EioWebSocket = await this.handshake(
      'websocket',
      crateDummyRequest(ws, this.actor),
      onHandshakeError
    );
    // else: a Socket object should be emitted in `this.handshake()` call
    handShaken.fulfill(t);
    return handShaken;
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
    const s = new EioServer(this);
    // FIXME the 2 object exists but inspecting them will cause error
    // like `webgpu needs the webgpu compatibility flag set`
    // logger('globalThis', typeof globalThis === 'object' && globalThis);
    // logger('self', typeof self === 'object' && self);

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
      'onConnection',
      [sid, this.state.id]
    ).then(res => {
      logger('onConnection res', res);
    });
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
    logger('websocketClose', {
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
    logger('webSockerMessage', ws, message);
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }
  }

  webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
    logger('websocket error', error);
  }
}
