import debug from 'debug';
import type sio from 'socket.io';

// events that don't get forwarded to other Sockets
const blacklistEvents: ReadonlySet<string> = new Set([
  // client internal event
  'connect',
  'disconnect',
  'connect_error',

  // server internal event?
  'disconnecting',
  'disconnect',
  'error',
]);

const logger = debug('limb:server:v1');

export function onV1Connection(namespace: sio.Namespace, socket: sio.Socket) {
  logger('connection', namespace.name, socket.id);

  socket.on('disconnecting', reason => {
    logger('disconnecting', namespace.name, socket.id, reason);
  });

  socket.on('disconnect', reason => {
    logger('disconnect', namespace.name, socket.id, reason);
  });

  socket.on('error', error => {
    logger('error', namespace.name, socket.id, error);
  });

  socket.onAny((event, message) => {
    if (blacklistEvents.has(event)) {
      return;
    }
    logger('forwarding', namespace.name, socket.id, event);
    // note this includes the sender
    namespace.send(event, message);
  });
}
