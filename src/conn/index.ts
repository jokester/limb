import {io} from 'socket.io-client';

import debug from 'debug';

const log = debug('app:conn');

export function startConn(url = 'localhost:3000'): () => void {
  const socket = io(url);
  socket.on('connect', () => {
    log('connected');
  });
  socket.on('disconnect', () => {
    log('disconnected');
  });
  socket.on('hello', data => {
    log('hello', data);
  });

  return () => {
    socket.close();
  };
}
