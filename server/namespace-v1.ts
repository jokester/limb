import debug from 'debug';
import type sio from 'socket.io';

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

  // only forward "message" events. Clients should use `send(clientEventName, value)`
  socket.on('message', (event, value) => {
    logger('forwarding message', namespace.name, socket.id, event, value);
    namespace.send(event, value);
  });
}
