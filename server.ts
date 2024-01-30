import * as http from 'node:http';
import * as sio from 'socket.io';
import debug from 'debug';
import type {ClientCommandBase, ClientCommands} from './src/conn';

const logger = debug('limb:server');

function waitSignal(name: string): Promise<string> {
  return new Promise(resolve => {
    process.on(name, () => resolve(name));
  });
}

function initServer(): http.Server {
  const httpServer = http.createServer();

  const sioServer = new sio.Server(httpServer, {
    cleanupEmptyChildNamespaces: true,
    cors: {
      origin(origin, callback) {
        // TODO impl CORS whitelist
        // e.g. ['http://localhost:3001', 'https://limb.jokester.io']
        callback(null, origin);
      },
    },
    serveClient: false,
  });

  // events that interact with server, and do not need to be broadcasted
  const serverOnlySocketEvent: ReadonlySet<string> = new Set([
    'disconnecting',
    'disconnect',
    'error',
    'subscribe',
  ]);

  sioServer.on('connection', socket => {
    logger('connection', socket.id);
    socket.on('disconnecting', reason => {
      logger('disconnect', socket.id, reason);
    });
    socket.on('disconnect', reason => {
      logger('disconnect', socket.id, reason);
    });
    socket.on('error', error => {
      logger('error', socket.id, error);
    });
    socket.on('message', (message: any) => {
      logger('message', socket.id, message);
      socket.send(message);
    });
    socket.on('subscribe', (msg: ClientCommands['subscribe']) => {
      socket.join(`room:${msg.topicId}`);
    });

    socket.onAny((event, message: ClientCommandBase) => {
      if (serverOnlySocketEvent.has(event)) {
        return;
      }
      logger('topic event', event);
      socket.broadcast.in(`room:${message.topicId}`).emit(event, message);
    });
  });

  return httpServer;
}

function waitServerEnd(server: http.Server): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

if (require.main === module) {
  const server = initServer();
  server.listen(3000);
  console.info('server listening on 3000');

  Promise.race([waitSignal('SIGTERM'), waitSignal('SIGINT')]).then(
    async cause => {
      console.info('closing server', cause);
      const error = await waitServerEnd(server).catch(e => e);
      if (error) {
        console.error('error closing server', error);
        process.exit(1);
      } else {
        console.info('server end');
        process.exit(0);
      }
    }
  );
}
