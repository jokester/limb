import {io} from 'socket.io-client';

import debug from 'debug';

const log = debug('app:conn');

interface SocketCallbacks {
  [event: string]: (data: any) => void;
}

const isLocalOrigin =
  typeof location === 'object' &&
  ['localhost', '127.0.0.1'].includes(location.host);

const origin = isLocalOrigin ? 'http://127.1:3000' : 'https://limb.jokester.io';

export function startConn<Commands extends Record<string, unknown>>(
  ownId: string,
  callbacks: SocketCallbacks,
  namespace: '/v1' | '/v2',
  serverOrigin = origin
): {
  send<T extends keyof Commands>(command: T, data: Commands[T]): void;
  close(): void;
} {
  const socket = io(serverOrigin + namespace);
  socket.on('connect', () => {
    log('connected', ownId);
  });
  socket.on('disconnect', () => {
    log('disconnected', ownId);
  });
  socket.on('connect_error', err => {
    log('connect_error', ownId, err);
    console.error('connect_error', err);
  });

  for (const [event, callback] of Object.entries(callbacks)) {
    socket.on(event, callback);
    socket.on(event, data => {
      log(event, data, ownId);
    });
  }

  return {
    send(command, data) {
      socket.emit(command as string, data);
    },
    close() {
      socket.close();
    },
  };
}
