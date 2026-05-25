const ROOM_TTL_SECONDS = parseInt(process.env.ROOM_TTL_SECONDS || '14400', 10);
const WALLET_TTL_SECONDS = parseInt(process.env.WALLET_TTL_SECONDS || '2592000', 10);

module.exports = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',
  REDIS_URL: process.env.REDIS_URL || '',
  ROOM_TTL_SECONDS,
  WALLET_TTL_SECONDS,
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),
};
