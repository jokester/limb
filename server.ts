import http from 'node:http';
import sio from 'socket.io';
import path from 'node:path';
import debug from 'debug';
import type {ClientCommandBase, ClientCommands} from './src/conn';

import serveHandler from 'serve-handler';

const logger = debug('limb:server');

function waitSignal(name: string): Promise<string> {
  return new Promise(resolve => {
    process.on(name, () => resolve(name));
  });
}

const distDir = path.join(__dirname, 'dist');

interface ServerGroup {
  http: http.Server;
  io: sio.Server;
}

function initServer(): ServerGroup {
  const httpServer = http.createServer();

  httpServer.on('request', (req, res) => {
    logger('request', req.url);
    serveHandler(req, res, {
      public: distDir,
      cleanUrls: true,
      directoryListing: false,
      trailingSlash: false,
      etag: true,
    });
  });

  const ioServer = new sio.Server(httpServer, {
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

  ioServer.on('connection', socket => {
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
  });

  return {http: httpServer, io: ioServer};
}

function waitServerEnd(serverGroup: ServerGroup): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    serverGroup.http.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    serverGroup.io.close();
  });
}

if (require.main === module) {
  const server = initServer();
  server.http.listen(3000);
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
