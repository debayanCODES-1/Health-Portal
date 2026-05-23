import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { tokenBlacklist } from '@/lib/redis';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export async function POST(request: NextRequest) {
  try {
    let refreshToken = '';
    
    try {
      const cookie = request.cookies.get('refreshToken');
      if (cookie) {
        refreshToken = typeof cookie === 'object' ? cookie.value : cookie;
      }
    } catch {
      // Fallback
    }

    if (!refreshToken) {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const parts = c.trim().split('=');
          return [parts[0], parts.slice(1).join('=')];
        })
      );
      refreshToken = cookies['refreshToken'];
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully.' }, { status: 200 });
    
    // Clear the refresh token cookie
    response.cookies.set({
      name: 'refreshToken',
      value: '',
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0 // instantly expires
    });

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        if (typeof decoded === 'object' && decoded !== null) {
          const { jti, exp } = decoded as { jti?: string; exp?: number };

          if (jti && exp) {
            const nowSeconds = Math.floor(Date.now() / 1000);
            const ttl = exp - nowSeconds;
            
            if (ttl > 0) {
              // Blacklist the JTI in Redis with remaining lifetime TTL
              await tokenBlacklist.set(jti, 'revoked', ttl);
            }
          }
        }
      } catch {
        // Token might already be malformed/expired, ignore but ensure cookie is cleared
      }
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message }, { status: 500 });
  }
}
