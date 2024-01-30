import * as http from 'node:http';
import * as sio from 'socket.io';
import debug from 'debug';
import * as ee from 'node:events';

const logger = debug('limb:server');

function waitSignal(name: string): Promise<string> {
  return new Promise(resolve => {
    process.on(name, () => resolve(name));
  });
}

function initServer(): http.Server {
  const httpServer = http.createServer();

  const sioServer = new sio.Server(httpServer, {
    path: '/signaling',
    serveClient: false,
  });

  sioServer.on('connection', socket => {});

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
