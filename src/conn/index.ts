import {io, Socket} from 'socket.io-client';

import debug from 'debug';

const log = debug('app:conn');

interface SocketCallbacks {
  [event: string]: (data: any) => void;
}

export interface ClientCommands extends Record<string, ClientCommandBase> {
  subscribe: ClientCommandBase & {topicId: string};
  ping: ClientCommandBase & {timestamp: string};
}

export interface ClientCommandBase {
  clientId: string;
  topicId: string;
}

export function startConn<Commands extends Record<string, unknown>>(
  ownId: string,
  callbacks: SocketCallbacks,
  url = 'https://limb.jokester.io/'
): {
  send<T extends keyof Commands>(command: T, data: Commands[T]): void;
  close(): void;
} {
  const socket = io(url);
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
