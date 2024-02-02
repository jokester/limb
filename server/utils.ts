import type net from 'node:net';
import http from 'node:http';
import debug from 'debug';
import sio from 'socket.io';

const logger = debug('limb:server-utils');

export function waitSignal(name: string): Promise<string> {
  return new Promise(resolve => {
    process.on(name, () => resolve(name));
  });
}

// socket.io does not provide a way to close all sockets
// so we need to record and close underlying TCP sockets
// learned this way from
export function prepareSocket(server: http.Server): () => number {
  const sockets = new Set<net.Socket>();
  server.on('connection', conn => {
    sockets.add(conn);
    conn.on('close', () => {
      sockets.delete(conn);
    });
  });

  return () => {
    let i = 0;
    for (const socket of sockets) {
      logger('force closing TCP socket', ++i);
      socket.destroy();
    }
    return i;
  };
}

export function closeSioSockets(server: sio.Server) {
  for (const [nsName, namespace] of server._nsps) {
    for (const [socketId, socket] of namespace.sockets) {
      logger('force closing socket.io socket');
      socket.disconnect(true);
    }
  }
}
