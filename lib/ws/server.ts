import { WebSocketServer } from 'ws';
import type { Server as HTTPServer } from 'http';
import { handleConnection } from './handler';

export function attachWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url ?? '/', `http://${request.headers.host}`);

    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
    // Non-/ws upgrades (e.g. /_next/webpack-hmr) are left for Next.js to handle
  });

  wss.on('connection', (ws) => {
    handleConnection(ws);
  });

  return wss;
}
