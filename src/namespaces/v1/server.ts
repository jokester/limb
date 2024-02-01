import debug from 'debug';
import type sio from 'socket.io';

import {ClientCommandBase, ClientCommands} from './types';

// events that interact with server, and do not need to be broadcasted
const serverOnlySocketEvent: ReadonlySet<string> = new Set([
  'disconnecting',
  'disconnect',
  'error',
  'subscribe',
]);

const logger = debug('limb:server:v1');

export function onV1Connection(namespace: sio.Namespace, socket: sio.Socket) {
  logger('connection', socket.id);

  socket.on('disconnecting', reason => {
    logger('disconnecting', socket.id, reason);
  });

  socket.on('disconnect', reason => {
    logger('disconnect', socket.id, reason);
  });

  socket.on('error', error => {
    logger('error', socket.id, error);
  });

  socket.on('subscribe', (msg: ClientCommands['subscribe']) => {
    logger('subscribe', socket.id, msg.clientId, msg.topicId);
    socket.join(`room:${msg.topicId}`);
  });

  socket.onAny((event, message: ClientCommandBase) => {
    if (serverOnlySocketEvent.has(event)) {
      return;
    }
    logger('topic event', event);
    socket.broadcast.in(`room:${message.topicId}`).emit(event, message);
  });
}
