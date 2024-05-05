import {
  type WsWebSocket,
  WebSocket as _EioWebSocket,
} from 'engine.io/lib/transports/websocket';
import {Socket as _EioSocket} from 'engine.io/lib/socket';
import type * as CF from '@cloudflare/workers-types';
import {EventEmitter} from 'events';
import {createDebugLogger} from './utils/logger';

const debugLogger = createDebugLogger('sio-worker:EngineServer');

export class EioWebSocket extends _EioWebSocket {
  get _socket(): WsWebSocket {
    // @ts-expect-error
    return this.socket;
  }
}

interface EioSocketOverrides {
  readonly _socket: EioWebSocket;
}

export class EioSocket extends _EioSocket implements EioSocketOverrides {
  onCfClose() {
    (this.transport as EioWebSocket)._socket.emit('close');
  }
  onCfMessage(msg: string | Buffer) {
    const msgStr = typeof msg === 'string' ? msg : msg.toString();
    (this.transport as EioWebSocket)._socket.emit('message', msgStr);
  }
  onCfError(msg: string, desc?: string) {
    (this.transport as EioWebSocket)._socket.emit('error', new Error(msg));
  }
}

export function createEioSocket(
  sid: string,
  cfSocket: CF.WebSocket
): EioSocket {
  const transport = createEioTransport(cfSocket);
}

function createEioTransport(realSocket: CF.WebSocket): _EioWebSocket {
  const websocket: WsWebSocket = new EventEmitter() as WsWebSocket;
  Object.assign(websocket, {
    _socket: {
      remoteAddress: 'FIXME: 127.0.0.1',
    },
    send(
      data: string | Buffer,
      _opts?: unknown,
      _callback?: (error?: any) => void
    ) {
      try {
        realSocket.send(data);
        debugLogger('fakeWsWebSocket.send', data);
        _callback?.();
      } catch (e: any) {
        debugLogger('fakeWsWebSocket.send error', data, e);
        _callback?.(e);
      }
    },
    close: () => realSocket.close(),
  });

  return new EioWebSocket({websocket: websocket});
}
