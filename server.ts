// Load .env files BEFORE any other imports that read process.env
// (the SDK reads ANTHROPIC_API_KEY at import time)
import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { createServer } from 'http';
import next from 'next';
import { attachWebSocketServer } from './lib/ws/server';
import { getConfig } from './lib/config';

const dev = process.env.NODE_ENV !== 'production';
const config = getConfig();

// Debug: verify API key loaded correctly at startup
if (config.apiKey) {
  const k = config.apiKey;
  const hex = Buffer.from(k.slice(-4)).toString('hex');
  console.log(`> API key loaded: ${k.slice(0, 12)}...${k.slice(-4)} (len=${k.length}, tail hex=${hex})`);
  if (k !== k.trim()) {
    console.warn('> WARNING: API key has leading/trailing whitespace!');
  }
  if (/[\r\n]/.test(k)) {
    console.warn('> WARNING: API key contains newline/carriage return characters!');
  }
} else {
  console.warn('> WARNING: No ANTHROPIC_API_KEY found in environment');
}

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
