import http from 'node:http';
import * as sio from 'socket.io';
import path from 'node:path';
import debug from 'debug';

import serveHandler from 'serve-handler';
import {onV2Connection} from './namespace-v2';
import {onV1Connection} from './namespace-v1';
import * as fs from 'fs';
import {closeSioSockets, prepareTcpConnect, waitSignal} from './utils';

const logger = debug('limb:server');

const distDir = path.join(__dirname, 'dist');
const distFound = fs.existsSync(distDir);

interface ServerGroup {
  http: http.Server;
  io: sio.Server;
  closeTcpSockets(): void;
}

function initServer(): ServerGroup {
  const httpServer = http.createServer();

  httpServer.on('request', (req, res) => {
    logger('request', req.url);

    if (distFound) {
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
    }
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
    logger('new namespace created', namespace.name, ioServer._nsps.size);
  });

  ioServer
    .of(/^\/v1\/[-\w:]+$/)
    .on('connection', socket => onV1Connection(socket.nsp, socket));

  const v2 = ioServer.of('/v2');
  v2.on('connection', socket => onV2Connection(v2, socket));

  return {
    http: httpServer,
    io: ioServer,
    closeTcpSockets: prepareTcpConnect(httpServer),
  };
}

function waitServerEnd(serverLike: http.Server | sio.Server): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    serverLike.close(error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

async function main(): Promise<0 | 1> {
  const server = initServer();
  server.http.listen(3000);
  console.info('server listening on 3000');

  {
    const shutdownCause = await Promise.race([
      waitSignal('SIGTERM'),
      waitSignal('SIGINT'),
    ]);
    console.info('server shutting down', shutdownCause);
  }

  try {
    // a workaround to disconnect & close, not proven to work yet
    server.io.disconnectSockets(true);

    setTimeout(() => {
      logger('force closing socket.io sockets');
      closeSioSockets(server.io);
    }, 5e3);
    setTimeout(() => {
      logger('force closing TCP sockets');
      server.closeTcpSockets();
    }, 8e3);
    await waitServerEnd(server.io); // this shutdowns http server too
    logger('socket.io closed');
    await waitServerEnd(server.http).catch(e => {
      if (e?.code !== 'ERR_SERVER_NOT_RUNNING') {
        throw e;
      }
    });
    logger('http closed');
    console.info('server shutdown');
    return 0;
  } catch (e) {
    logger('server shutdown with error', e);
    console.error('server end with error', e);
    return 1;
  }
}

if (require.main === module) {
  main().then(
    exitCode => process.exit(exitCode),
    e => {
      console.error('unexpected error', e);
      process.exit(2);
    }
  );
}