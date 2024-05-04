import type * as CF from '@cloudflare/workers-types';
import {ActorMethodMap, buildSend} from './utils/send';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {createDebugLogger} from './utils/logger';
import {EventEmitter} from 'events';
import {Socket as EioSocket} from 'engine.io/lib/socket';
import {Server as BaseSioServer} from 'socket.io/lib/index';
import {WorkerBindings} from './workerApp';
import * as limbV1 from '@jokester/sio-server/namespace-v1';

const debugLogger = createDebugLogger('sio-worker:SioActor');

/**
 * An eio.Socket, identified by a sid, located in a CF Durable Object
 */
export interface DistantSocketAddress {
  socketId: string;
  doId: string;
}

interface Methods extends ActorMethodMap {
  onConnection(socketAddr: DistantSocketAddress): Promise<void>;

  onConnectionClose(socketAddr: DistantSocketAddress): Promise<void>;

  onConnectionError(socketAddr: DistantSocketAddress): Promise<void>;

  onMessage(
    socketAddr: DistantSocketAddress,
    data: {
      message: string;
    }
  ): Promise<void>;
}

/**
 * A stub that (looking from a sio.Server) works like an eio.Socket
 */
class DistantSocket
  extends EventEmitter
  implements Pick<EioSocket, 'readyState' | 'send' | 'transport'>
{
  constructor(readonly sid: string, readonly supervisor: CF.DurableObjectId) {
    super();
  }

  get readyState() {
    return 'open' as const;
  }

  get transport() {
    return {
      writable: true,
    };
  }

  close() {
    debugLogger('DistantSocket#close()');
  }

  write(
    packets: (string | Buffer)[],
    opts: {
      compress?: boolean;
      volatile?: boolean;
      preEncoded?: boolean;
      wsPreEncoded?: string;
    }
  ) {
    // TODO
    debugLogger('DistantSocket#write()', packets, opts);
  }
}

class SioServer extends BaseSioServer implements Methods {
  constructor(
    private state: CF.DurableObjectState,

    private readonly env: WorkerBindings
  ) {
    super({
      connectionStateRecovery: undefined,
    });
  }

  private readonly _remoteConns = new Map<string, DistantSocket>();

  private getDistantSocket(
    {socketId: sid, doId}: DistantSocketAddress,
    allowCreate: boolean
  ): null | DistantSocket {
    if (this._remoteConns.has(sid)) {
      return this._remoteConns.get(sid)!;
    }
    if (!allowCreate) {
      return null;
    }
    const socket = new DistantSocket(
      sid,
      this.env.engineActor.idFromString(doId)
    );
    this._remoteConns.set(sid, socket);
    return socket;
  }
  // FIXME caller should save/restore internal state
  async onConnection(socketAddr: DistantSocketAddress): Promise<void> {
    const socket = this.getDistantSocket(socketAddr, true)!;
    // @ts-expect-error
    this.onconnection(socket);
  }

  async onMessage(socketAddr: DistantSocketAddress, data: {message: string}) {
    const s = this.getDistantSocket(socketAddr, false);
    if (!s) {
      debugLogger('WARN onMessage: socket not found', socketAddr);
      return;
    }
    s.emit('data', data);
  }
  async onConnectionClose(socketAddr: DistantSocketAddress) {}

  async onConnectionError(socketAddr: DistantSocketAddress) {}
}

/**
 * holds a sio.Server
 */
export class SioActor implements CF.DurableObject {
  static readonly send = buildSend<Methods>();

  constructor(
    private readonly state: CF.DurableObjectState,
    private readonly env: WorkerBindings
  ) {}

  sioServer = lazy(() => {
    const s = new SioServer(this.state, this.env);
    s.of(limbV1.parentNamespace).on('connection', socket =>
      limbV1.onV1Connection(socket)
    );
    return s;
  });

  readonly server = lazy(() =>
    new Hono()
      .post('/onConnection', async ctx => {
        const [socketAddr]: Parameters<Methods['onConnection']> =
          await ctx.req.json();

        debugLogger('onConnection', socketAddr);

        await this.sioServer.value.onConnection(socketAddr);

        return ctx.json({message: 'got sid'});
      })
      .post('/onMessage', async ctx => {
        const [socketAddr, data]: Parameters<Methods['onMessage']> =
          await ctx.req.json();

        debugLogger('onMessage', socketAddr, data);

        await this.sioServer.value.onMessage(socketAddr, data);
      })
      .post('/onConnectionClose', async ctx => {
        const [socketAddr]: Parameters<Methods['onConnectionClose']> =
          await ctx.req.json();

        debugLogger('onConnectionClose', socketAddr);
      })
      .post('/onConnectionError', async ctx => {
        const [socketAddr]: Parameters<Methods['onConnectionError']> =
          await ctx.req.json();

        debugLogger('onConnectionError', socketAddr);
      })
  );

  async fetch(request: CF.Request): Promise<CF.Response> {
    // debugLogger('fetch', request);
    // @ts-expect-error
    return this.server.value.fetch(request);
  }
}
