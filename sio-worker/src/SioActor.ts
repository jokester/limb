import type * as CF from '@cloudflare/workers-types';
import {buildSend} from './utils/send';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {createDebugLogger} from './utils/logger';
import {EventEmitter} from 'events';
import type * as eio from 'engine.io/lib/engine.io';
import {Server as BaseSioServer} from 'socket.io/lib/index';
import {Client as SioClient} from 'socket.io/lib/client';
import {WorkerBindings} from './workerApp';
import * as limbV1 from '@jokester/sio-server/namespace-v1';
import {EngineActor} from './EngineActor';

const debugLogger = createDebugLogger('sio-worker:SioActor');

/**
 * An eio.Socket, identified by a engine.io sid, located in a CF Durable Object
 */
export interface DistantSocketAddress {
  socketId: string;
  doId: string;
}

interface Methods {
  onConnection(socketAddr: DistantSocketAddress): Promise<void>;

  onConnectionClose(
    socketAddr: DistantSocketAddress,
    closeReason: string
  ): Promise<void>;

  onConnectionError(
    socketAddr: DistantSocketAddress,
    error: object
  ): Promise<void>;

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
  implements Pick<eio.Socket, 'readyState' | 'transport'>
{
  constructor(
    readonly sid: string,
    readonly supervisor: CF.DurableObjectId,
    private readonly env: WorkerBindings
  ) {
    super();
  }

  get readyState() {
    return 'open' as const;
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
    if (typeof packets !== 'string') {
      debugLogger('DistantSocket#write() expected string', packets);
      return;
    }
    EngineActor.send(
      {
        kind: this.env.engineActor,
        id: this.supervisor,
      },
      'send',
      []
    ).catch(e => {
      debugLogger('DistantSocket#write() failed', e);
    });
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

  private readonly _distantSockets = new Map<
    /* eio sid */ string,
    DistantSocket
  >();

  private readonly _clients = new Map<
    /* eio sid */ string,
    SioClient<any, any, any, any>
  >();

  private getDistantSocket(
    {socketId: sid, doId}: DistantSocketAddress,
    allowCreate: boolean
  ): null | DistantSocket {
    if (this._distantSockets.has(sid)) {
      return this._distantSockets.get(sid)!;
    }
    if (!allowCreate) {
      return null;
    }
    const socket = new DistantSocket(
      sid,
      this.env.engineActor.idFromString(doId),
      this.env
    );
    this._distantSockets.set(sid, socket);
    return socket;
  }
  // FIXME caller should save/restore internal state

  /**
   * this replaces {@name onconnection} in parent class
   * unlike the impl in socket.io , we need to keep references to Client
   * @param socketAddr
   */
  async onConnection(socketAddr: DistantSocketAddress): Promise<void> {
    const socket = this.getDistantSocket(socketAddr, true)!;

    const client = new SioClient(this, socket as unknown as eio.Socket);
    // @ts-expect-error
    client.writeToEngine = (encodedPackets, opts) => {
      EngineActor.send(
        {
          kind: this.env.engineActor,
          id: socket.supervisor,
        },
        'sendPackets',
        [socketAddr.socketId, encodedPackets, opts]
      ).catch(e =>
        debugLogger('writeToEngine(): failed calling sendPackets()', e)
      );
    };
    this._clients.set(socketAddr.socketId, client);
  }

  async onMessage(socketAddr: DistantSocketAddress, data: {message: string}) {
    const s = this.getDistantSocket(socketAddr, false);
    if (!s) {
      debugLogger('WARN onMessage: socket not found', socketAddr);
      return;
    }
    s.emit('data', data);
  }
  async onConnectionClose(
    socketAddr: DistantSocketAddress,
    closeReason: string
  ) {
    const s = this.getDistantSocket(socketAddr, false);
    if (s) {
      s.emit('close', closeReason);
    } else {
      debugLogger('WARN onConnectionClose: socket not found', socketAddr);
    }
    this._distantSockets.delete(socketAddr.socketId);
    this._clients.delete(socketAddr.socketId);
  }

  async onConnectionError(
    socketAddr: DistantSocketAddress,
    cause: object
  ): Promise<void> {
    const s = this.getDistantSocket(socketAddr, false);
    if (s) {
      s.emit('error', cause);
    } else {
      debugLogger('WARN onConnectionError: socket not found', socketAddr);
    }
  }
}

/**
 * holds a sio.Server
 */
export class SioActor implements CF.DurableObject {
  // @ts-ignore
  static readonly send = buildSend<Methods>();

  constructor(
    private readonly state: CF.DurableObjectState,
    private readonly env: WorkerBindings
  ) {}

  sioServer = lazy(() => {
    const s = new SioServer(this.state, this.env);
    s.of(limbV1.parentNamespace).on('connection', limbV1.onV1Connection);
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
        const [socketAddr, closeReason]: Parameters<
          Methods['onConnectionClose']
        > = await ctx.req.json();

        debugLogger('onConnectionClose', socketAddr);
        await this.sioServer.value.onConnectionClose(socketAddr, closeReason);
      })
      .post('/onConnectionError', async ctx => {
        const [socketAddr]: Parameters<Methods['onConnectionError']> =
          await ctx.req.json();

        debugLogger('onConnectionError', socketAddr);
        await this.sioServer.value.onConnectionError(socketAddr);
      })
  );

  async fetch(request: CF.Request): Promise<CF.Response> {
    // debugLogger('fetch', request);
    // @ts-expect-error
    return this.server.value.fetch(request);
  }
}
