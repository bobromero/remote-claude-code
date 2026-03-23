import { createServer } from 'http';
import next from 'next';
import { attachWebSocketServer } from './lib/ws/server';
import { getConfig } from './lib/config';

const dev = process.env.NODE_ENV !== 'production';
const config = getConfig();

const httpServer = createServer();

const app = next({ dev, httpServer });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  httpServer.on('request', (req, res) => {
    handle(req, res);
  });

  attachWebSocketServer(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`> Ready on http://localhost:${config.port}`);
    console.log(`> WebSocket on ws://localhost:${config.port}/ws`);
    console.log(`> Working directory: ${config.defaultCwd}`);
    console.log(`> Mode: ${dev ? 'development' : 'production'}`);
  });
});
