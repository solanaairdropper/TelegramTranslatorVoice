import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import { connectDB } from './db/connection.js';
import { router } from './server/http-routes.js';
import { setupSocketHandlers } from './server/ws-handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(cookieParser());
  app.use(express.json());
  app.use('/api/voice', express.raw({ type: '*/*', limit: '20mb' }));

  // Static files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // API routes
  app.use(router);

  // Room page route
  app.get('/room/:code', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'room.html'));
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' },
    path: '/voice/socket.io',
    maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for voice samples
  });

  setupSocketHandlers(io);

  httpServer.listen(config.server.port, () => {
    console.log(`Server running on http://localhost:${config.server.port}`);
  });
}

main().catch(console.error);
