import type * as CF from '@cloudflare/workers-types';
import {ActorMethodMap, buildSend} from './utils/send';
import {lazy} from './utils/lazy';
import {Hono} from 'hono';
import {createDebugLogger} from './utils/logger';
import type {Socket as EioSocket} from 'engine.io/lib/socket';
import {Server as BaseSioServer} from 'socket.io/lib/index';
import {WorkerBindings} from './workerApp';

const debugLogger = createDebugLogger('sio-worker:SioActor');

/**
 * An eio.Socket, identified by a sid, located in a CF Durable Object
 */
interface SocketAddress {
  sid: string;
  doName: string;
}

interface Methods extends ActorMethodMap {
  onConnection(socketAddr: SocketAddress): Promise<void>;

  onConnectionClose(socketAddr: SocketAddress): Promise<void>;

  onConnectionError(socketAddr: SocketAddress): Promise<void>;

  onMessage(
    socketAddr: SocketAddress,
    data: {
      message: string;
    }
  ): Promise<void>;
}

class MockSocket implements InstanceType<typeof EioSocket> {
  // TODO
  // event emitter + writable interface for this DO
}

class SioServer extends BaseSioServer implements Methods {
  constructor(
    private state: CF.DurableObjectState,

    private readonly env: WorkerBindings
  ) {
    super();
  }
  // FIXME caller should save/restore internal state
  async onConnection(socketAddr: SocketAddress): Promise<void> {
    const f = this.env.engineActor.idFromName(socketAddr.doName);
  }

  async onMessage(socketAddr: SocketAddress, data: {message: string}) {}
  async onConnectionClose(socketAddr: SocketAddress) {}

  async onConnectionError(socketAddr: SocketAddress) {}
}

/**
 * works like a sio.Server
 */
export class SioActor implements CF.DurableObject {
  static readonly send = buildSend<Methods>();

  constructor(
    private readonly state: CF.DurableObjectState,
    private readonly env: WorkerBindings
  ) {}

  sioServer = lazy(() => {
    const s = new SioServer(this.state, this.env);
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
