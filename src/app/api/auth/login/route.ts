import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_access_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export async function POST(request: Request) {
  try {
    const { email, password, aadhar } = await request.json();

    const identifier = aadhar || email;
    if (!identifier || !password) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing credentials.' }, { status: 400 });
    }

    // Lookup user in the database
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { name: identifier }
        ]
      }
    });

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Invalid credentials.' }, { status: 401 });
    }

    // 1. Generate Access Token (5m expiry)
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: '300s' }
    );

    // 2. Generate Refresh Token (7d expiry)
    const jti = crypto.randomUUID();
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role, jti },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );

    const response = NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }, { status: 200 });

    // 3. Store Refresh Token in HttpOnly, Secure, SameSite=Strict cookie
    response.cookies.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days in seconds
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Login error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR', message }, { status: 500 });
  }
}
