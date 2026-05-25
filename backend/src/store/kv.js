const Redis = require('ioredis');

class KeyValueStore {
  constructor() {
    this.memory = new Map();
    this.memoryExpiry = new Map();
    this.redis = null;
    this.ready = false;
    this.mode = 'memory';
  }

  async init(redisUrl) {
    if (!redisUrl) {
      console.log('📦 KV store: in-memory (set REDIS_URL for Redis)');
      this.ready = true;
      return;
    }

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      await this.redis.connect();
      await this.redis.ping();
      this.mode = 'redis';
      this.ready = true;
      console.log('📦 KV store: Redis connected');
    } catch (err) {
      console.warn('⚠️ Redis unavailable, using in-memory KV:', err.message);
      this.redis = null;
      this.mode = 'memory';
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
      return this.redis.get(key);
    }
    return this._memoryGet(key);
  }

  async set(key, value, ttlSeconds = null) {
    if (this.redis) {
      if (ttlSeconds) {
        await this.redis.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.redis.set(key, value);
      }
      return;
    }
    this._memorySet(key, value, ttlSeconds);
  }

  async del(key) {
    if (this.redis) {
      await this.redis.del(key);
      return;
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
