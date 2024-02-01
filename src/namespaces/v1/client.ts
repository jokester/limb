import {io} from 'socket.io-client';

import debug from 'debug';

export type * from './types';

const log = debug('limbo:client:v1');

interface SocketCallbacks {
  [event: string]: (data: any) => void;
}

const isLocalOrigin =
  typeof location === 'object' &&
  ['localhost', '127.0.0.1'].includes(location.hostname);

const defaultOrigin = isLocalOrigin
  ? 'http://127.0.0.1:3000'
  : 'https://limb.jokester.io';

export function connectV1<Commands extends Record<string, unknown>>(
  ownId: string,
  callbacks: SocketCallbacks,
  serverOrigin = defaultOrigin
): {
  send<T extends keyof Commands>(command: T, data: Commands[T]): void;
  close(): void;
} {
  const socket = io(serverOrigin + '/v1');
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
