import { NextResponse } from 'next/server';
import { tokenBlacklist } from './redis';

interface CachedResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

/**
 * Higher-order function wrapping Next.js route handlers with global idempotency guarantees.
 * 
 * Flow:
 * 1. Checks if `X-Idempotency-Key` header exists and matches UUIDv4.
 * 2. Queries Redis to see if the key exists:
 *    - If value is 'LOCKED', returns HTTP 409 Conflict.
 *    - If value contains a serialized response, returns it immediately (HTTP Cache Hit).
 * 3. If key is empty, sets status as 'LOCKED' with a 30s lock time.
 * 4. Executes the inner controller.
 * 5. Serializes the successful/failed controller response and stores it in Redis with a 24-hour TTL.
 */
export function withIdempotency(handler: (req: Request) => Promise<NextResponse>) {
  return async function (request: Request) {
    // Clone request to avoid body consumption errors down the road
    const requestClone = request.clone();
    
    const key = request.headers.get('x-idempotency-key');
    if (!key) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Missing required X-Idempotency-Key header.' },
        { status: 400 }
      );
    }

    // Strict UUIDv4 pattern validation
    const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidv4Regex.test(key)) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid X-Idempotency-Key format. Must be a valid UUIDv4.' },
        { status: 400 }
      );
    }

    const redisKey = `idempotency:${key}`;

    try {
      // 1. Look up idempotency key in cache
      const cachedData = await tokenBlacklist.get(redisKey);
      if (cachedData) {
        if (cachedData === 'LOCKED') {
          return NextResponse.json(
            { error: 'CONFLICT', message: 'A concurrent request with the same idempotency key is already in progress.' },
            { status: 409 }
          );
        }

        try {
          const cached: CachedResponse = JSON.parse(cachedData);
          const headers = {
            ...cached.headers,
            'X-Cache-Lookup': 'HIT'
          };
          return NextResponse.json(cached.body, { status: cached.status, headers });
        } catch {
          // Fallback if cached object is corrupt
        }
      }

      // 2. Acquire locks to prevent race conditions during execution
      await tokenBlacklist.set(redisKey, 'LOCKED', 30); // 30-second lock window

      // 3. Execute request controller
      const response = await handler(requestClone);

      // 4. Capture body and headers
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        // Not a JSON response
      }

      const cachedResponse: CachedResponse = {
        status: response.status,
        body,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      // 5. Store response payload with a 24-hour TTL (86400 seconds)
      await tokenBlacklist.set(redisKey, JSON.stringify(cachedResponse), 24 * 60 * 60);

      // Return response with HIT/MISS markers
      const responseHeaders = {
        ...cachedResponse.headers,
        'X-Cache-Lookup': 'MISS'
      };

      return NextResponse.json(body, { status: response.status, headers: responseHeaders });

    } catch (err) {
      // Release lock on runtime controller failure to allow retry
      await tokenBlacklist.del(redisKey);
      console.error('Idempotency wrapper caught error:', err);
      const msg = err instanceof Error ? err.message : 'Idempotency processor error.';
      return NextResponse.json(
        { error: 'INTERNAL_SERVER_ERROR', message: msg },
        { status: 500 }
      );
    }
  };
}
