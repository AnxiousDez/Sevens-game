const Redis = require('ioredis');

/** Options recommended for Upstash / serverless Redis */
function redisOptions(redisUrl) {
  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 10000,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
  };
  if (redisUrl.startsWith('rediss://')) {
    opts.tls = {};
  }
  return opts;
}

class KeyValueStore {
  constructor() {
    this.memory = new Map();
    this.memoryExpiry = new Map();
    this.redis = null;
    this.ready = false;
    this.mode = 'memory';
  }

  _attachErrorHandler() {
    if (!this.redis) return;
    this.redis.on('error', (err) => {
      console.warn('Redis connection error:', err.message);
    });
  }

  _degradeToMemory(reason) {
    console.warn('⚠️ Redis degraded to in-memory:', reason);
    if (this.redis) {
      try {
        this.redis.disconnect();
      } catch {
        /* ignore */
      }
      this.redis = null;
    }
    this.mode = 'memory';
  }

  async init(redisUrl) {
    if (!redisUrl) {
      console.log('📦 KV store: in-memory (set REDIS_URL for Redis)');
      this.ready = true;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, redisOptions(redisUrl));
      this._attachErrorHandler();
      await this.redis.connect();
      await this.redis.ping();
      this.mode = 'redis';
      this.ready = true;
      console.log('📦 KV store: Redis connected');
    } catch (err) {
      console.warn('⚠️ Redis unavailable, using in-memory KV:', err.message);
      this._degradeToMemory(err.message);
      this.ready = true;
    }
  }

  _memoryGet(key) {
    const exp = this.memoryExpiry.get(key);
    if (exp && Date.now() > exp) {
      this.memory.delete(key);
      this.memoryExpiry.delete(key);
      return null;
    }
    return this.memory.get(key) ?? null;
  }

  _memorySet(key, value, ttlSeconds) {
    this.memory.set(key, value);
    if (ttlSeconds) {
      this.memoryExpiry.set(key, Date.now() + ttlSeconds * 1000);
    } else {
      this.memoryExpiry.delete(key);
    }
  }

  async get(key) {
    if (this.redis) {
      try {
        return await this.redis.get(key);
      } catch (err) {
        this._degradeToMemory(err.message);
      }
    }
    return this._memoryGet(key);
  }

  async set(key, value, ttlSeconds = null) {
    if (this.redis) {
      try {
        if (ttlSeconds) {
          await this.redis.set(key, value, 'EX', ttlSeconds);
        } else {
          await this.redis.set(key, value);
        }
        return;
      } catch (err) {
        this._degradeToMemory(err.message);
      }
    }
    this._memorySet(key, value, ttlSeconds);
  }

  async del(key) {
    if (this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        this._degradeToMemory(err.message);
      }
    }
    this.memory.delete(key);
    this.memoryExpiry.delete(key);
  }

  async getJson(key) {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async setJson(key, obj, ttlSeconds = null) {
    await this.set(key, JSON.stringify(obj), ttlSeconds);
  }
}

const kv = new KeyValueStore();

module.exports = { kv, KeyValueStore };
