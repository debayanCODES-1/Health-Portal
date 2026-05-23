import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { tokenBlacklist } from '@/lib/redis';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_access_secret';
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

    if (!refreshToken) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Refresh token missing.' }, { status: 401 });
    }

    // Verify Refresh Token
    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch {
      const response = NextResponse.json({ error: 'UNAUTHORIZED', message: 'Invalid refresh token.' }, { status: 401 });
      response.cookies.delete('refreshToken');
      return response;
    }

    if (typeof decoded !== 'object' || decoded === null) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Malformed token payload.' }, { status: 401 });
    }

    const { userId, role, jti } = decoded as { userId: string; role: string; jti?: string };

    if (!jti) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Malformed token payload.' }, { status: 401 });
    }

    // Check Redis revocation blacklist
    const isBlacklisted = await tokenBlacklist.get(jti);
    if (isBlacklisted) {
      const response = NextResponse.json({ error: 'UNAUTHORIZED', message: 'Token revoked.' }, { status: 401 });
      response.cookies.delete('refreshToken');
      return response;
    }

    // Generate new Access Token (5m expiry)
    const accessToken = jwt.sign(
      { userId, role },
      JWT_SECRET,
      { expiresIn: '300s' }
    );

    return NextResponse.json({ accessToken }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message }, { status: 500 });
  }
}
