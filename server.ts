import http from 'node:http';
import sio from 'socket.io';
import path from 'node:path';
import debug from 'debug';

import serveHandler from 'serve-handler';
import {onV2Connection} from './src/namespaces/v2/server';
import {onV1Connection} from './src/namespaces/v1/server';

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
      // FIXME
      rewrites: [{source: '/topics/*', destination: '/index.html'}],
      cleanUrls: true,
      directoryListing: false,
      trailingSlash: false,
      etag: true,
    }).catch(e => {
      console.error('serveHandler: error handling request', e);
    });
  });

  const ioServer = new sio.Server(httpServer, {
    cleanupEmptyChildNamespaces: true,
    cors: {
      origin(origin, callback) {
        // allow all cors call
        callback(null, origin);
      },
    },
    serveClient: false,
  });

  ioServer.on('new_namespace', namespace => {
    logger('new namespace created', namespace.name, ioServer._nsps.size)
  });

  ioServer
    .of(/^\/v1\/[-\w:]*$/)
    .on('connection', socket => onV1Connection(socket.nsp, socket));

  const v2 = ioServer.of('/v2');
  v2.on('connection', socket => onV2Connection(v2, socket));

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
