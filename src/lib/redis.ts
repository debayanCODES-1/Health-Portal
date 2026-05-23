import Redis from 'ioredis';

let redis: Redis | null = null;
const redisUrl = process.env.REDIS_URL;

// In-memory fallback for environments without a running Redis server (local testing / CI)
const inMemoryBlacklist = new Map<string, { value: string; expiry: number }>();

if (redisUrl) {
  try {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 1000,
      retryStrategy: () => null, // Do not retry connection on failure, fail fast and fallback
    });
    
    redis.on('error', () => {
      // Quietly log error and ensure client falls back to memory cache
      redis = null;
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('Failed to initialize Redis client, falling back to in-memory store:', msg);
    redis = null;
  }
} else {
  console.log('No REDIS_URL provided. Using in-memory store for session revocation.');
}

export const tokenBlacklist = {
  /**
   * Add a token ID (jti) to the blacklist.
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (redis) {
      try {
        await redis.setex(key, ttlSeconds, value);
        return;
      } catch (err) {
        console.warn('Redis setex failed, falling back to in-memory cache:', err);
      }
    }
    const expiry = Date.now() + ttlSeconds * 1000;
    inMemoryBlacklist.set(key, { value, expiry });
  },

  /**
   * Check if a token ID (jti) is in the blacklist.
   */
  async get(key: string): Promise<string | null> {
    // Proactively clean up expired in-memory entries
    for (const [k, entry] of inMemoryBlacklist.entries()) {
      if (Date.now() > entry.expiry) {
        inMemoryBlacklist.delete(k);
      }
    }

    if (redis) {
      try {
        return await redis.get(key);
      } catch (err) {
        console.warn('Redis get failed, falling back to in-memory cache:', err);
      }
    }
    
    const entry = inMemoryBlacklist.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      inMemoryBlacklist.delete(key);
      return null;
    }
    
    return entry.value;
  },

  /**
   * Delete a key from the blacklist.
   */
  async del(key: string): Promise<void> {
    if (redis) {
      try {
        await redis.del(key);
        return;
      } catch (err) {
        console.warn('Redis del failed, falling back to in-memory cache:', err);
      }
    }
    inMemoryBlacklist.delete(key);
  }
};
