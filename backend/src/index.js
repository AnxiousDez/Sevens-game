const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { kv } = require('./store/kv');
const { REDIS_URL, CLIENT_ORIGINS, PORT, HOST } = require('./config');

const LAN_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+):5173$/;

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (CLIENT_ORIGINS.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && LAN_ORIGIN.test(origin)) return true;
  return false;
}

async function main() {
  await kv.init(REDIS_URL);

  const app = express();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: (origin, cb) => {
        if (isAllowedOrigin(origin)) cb(null, true);
        else cb(new Error(`CORS blocked: ${origin}`));
      },
      methods: ['GET', 'POST'],
    },
  });

  app.use(cors({
    origin: (origin, cb) => {
      if (isAllowedOrigin(origin)) cb(null, true);
      else cb(new Error(`CORS blocked: ${origin}`));
    },
  }));
  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      store: kv.mode,
    });
  });

  const registerSocketHandlers = require('./socket/handlers');
  registerSocketHandlers(io);

  server.listen(PORT, HOST, () => {
    console.log(`🃏 Sevens game server running on http://${HOST}:${PORT}`);
    console.log(`   KV: ${kv.mode}`);
    if (CLIENT_ORIGINS.length) {
      console.log(`   CORS origins: ${CLIENT_ORIGINS.join(', ')}`);
    } else if (process.env.NODE_ENV === 'production') {
      console.warn('   ⚠️ Set CLIENT_ORIGIN in production (comma-separated frontend URLs)');
    } else {
      console.log('   CORS: localhost + LAN IPs on port 5173');
    }
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
