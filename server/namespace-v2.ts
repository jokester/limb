import debug from 'debug';
import type sio from 'socket.io';

import {ClientCommandBase, ClientCommands} from '../types/namespace-v2';

const logger = debug('limb:server:v2');

// events should not be broadcasted
// i.e. a socket won't receive them from peer sockets
const csInteractionEvents: ReadonlySet<string> = new Set([
  // client internal
  'connect_error',
  'connect',
  // server internal
  'disconnecting',
  'disconnect',
  'error',
  // client-server interactions
  'join',
  'leave',
  'welcome',
  'pong',
]);

export function onV2Connection(
  namespace: sio.Namespace,
  socket: sio.Socket
): void {
  logger('connection', socket.id);

  function onInternalError(error: unknown): void {
    logger('error handling ', socket.id, error);
    socket.disconnect(true);
  }

  socket.send('welcome', {socketId: socket.id});

  socket.on('disconnecting', reason => {
    logger('disconnecting', socket.id, reason);
  });

  socket.on('disconnect', reason => {
    logger('disconnect', socket.id, reason);
  });

  socket.on('error', error => {
    logger('error', socket.id, error);
  });

  socket.on('join', (msg: ClientCommands['join']) => {
    logger('join', socket.id, msg.room);
    try {
      socket.join(`room:${msg.room}`);
    } catch (e) {
      onInternalError(e);
    }
  });

  socket.on('leave', (msg: ClientCommands['join']) => {
    logger('join', socket.id, msg.room);
    try {
      socket.leave(`room:${msg.room}`);
    } catch (e) {
      onInternalError(e);
    }
  });

  socket.onAny((event, clientMessage: ClientCommandBase) => {
    try {
      if (csInteractionEvents.has(event)) {
        return;
      } else if (event === 'ping') {
        socket.send('pong', {
          from: clientMessage.from,
        });
        forwardMessage(namespace, socket, event, clientMessage);
      } else {
        forwardMessage(namespace, socket, event, clientMessage);
      }
      logger('topic event', event);
    } catch (e) {
      onInternalError(e);
    }
  });
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
