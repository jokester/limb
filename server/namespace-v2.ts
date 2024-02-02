import debug from 'debug';
import type sio from 'socket.io';

import {ClientCommandBase, ClientCommands} from '../types/namespace-v2';

const logger = debug('limb:server:v2');

export function onV2Connection(
  namespace: sio.Namespace,
  socket: sio.Socket
): void {
  logger('connection', socket.id);

  socket.on('disconnecting', (reason: unknown) => {
    logger('disconnecting', socket.id, reason);
  });

  socket.on('disconnect', (reason: unknown) => {
    logger('disconnect', socket.id, reason);
  });

  socket.on('error', (error: unknown) => {
    logger('error', socket.id, error);
    onInternalError(socket, error);
  });

  socket.on('message', (event, payload) => {
    try {
      handleUserMessage(namespace, socket, event, payload);
    } catch (e) {
      onInternalError(socket, e);
    }
  });

  socket.send('sys:welcome', {socketId: socket.id});
}

function handleUserMessage(
  namespace: sio.Namespace,
  socket: sio.Socket,
  event: string,
  _payload: ClientCommandBase
) {
  logger('user message', socket.id, event, _payload.nonce);

  switch (event) {
    case 'sys:ping': {
      const now = new Date().toISOString();
      socket.send('sys:pong', {timestamp: now});
      break;
    }
    case 'room:join': {
      const payload = _payload as ClientCommands[typeof event];
      socket.join(`room:${payload.room}`);
      break;
    }
    case 'room:leave': {
      const payload = _payload as ClientCommands[typeof event];
      socket.leave(`room:${payload.room}`);
      break;
    }
    default:
      forwardMessage(namespace, socket, event, _payload);
  }
}

function forwardMessage(
  namespace: sio.Namespace,
  socket: sio.Socket,
  event: string,
  clientMessage: ClientCommandBase
): void {
  const rewritten = {
    ...clientMessage,
    to: undefined,
    from: socket.id,
  };
  clientMessage.to?.forEach(to => {
    if (to.startsWith('room:')) {
      socket.in(to).emit(event, rewritten);
    } else if (to.startsWith('socket:')) {
      const socketId = to.slice('socket:'.length);
      namespace.sockets.get(socketId)?.emit(event, rewritten);
    } else {
      logger('unexpected to', socket.id, to);
    }
  });
}

function onInternalError(socket: sio.Socket, error: unknown): void {
  logger('error handling ', socket.id, error);
  socket.disconnect(true);
}
