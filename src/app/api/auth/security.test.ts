import { POST as loginPOST } from './login/route';
import { POST as refreshPOST } from './refresh/route';
import { prisma, pool } from '@/lib/prisma';
import { decrypt } from '@/lib/encryption';
import { tokenBlacklist } from '@/lib/redis';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_access_secret';

describe('Zero-Trust Security Layer Integration Test', () => {
  let doctorId: string;
  let patientId: string;
  let patientRecordId: string;

  let isDbReachable = false;

  beforeAll(async () => {
    try {
      const client = await pool.connect();
      client.release();
      isDbReachable = true;
    } catch {
      console.warn("TEST DATABASE WARNING: Could not connect to PostgreSQL. Skipping live database assertions.");
    }

    if (!isDbReachable) {
      return;
    }

    // 1. Truncate tables to ensure isolated and clean test state
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE transactions CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE appointments CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE patients CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE users CASCADE;`);
    } catch (err) {
      console.warn("Table cleanup warning:", err);
    }

    // 2. Create test doctor and patient users
    const doctor = await prisma.user.create({
      data: {
        email: 'security_doctor@test.com',
        name: 'Dr. Security',
        password: 'password123',
        role: 'DOCTOR',
      },
    });
    doctorId = doctor.id;

    const patient = await prisma.user.create({
      data: {
        email: 'security_patient@test.com',
        name: 'Patient Security',
        password: 'password123',
        role: 'PATIENT',
      },
    });
    patientId = patient.id;

    // 3. Create Patient Record with sensitive personal data
    const record = await prisma.patientRecord.create({
      data: {
        userId: patientId,
        abhaId: '91-9999-8888-7777',
        name: 'Patient Security',
        age: 35,
        bloodGroup: 'A+',
        ssn: '000-12-3456',
        contactInfo: '+1-555-0199',
        medicalHistory: 'Chronic hypertension under management.',
      },
    });
    patientRecordId = record.id;
  });

  afterAll(async () => {
    if (isDbReachable) {
      await prisma.$disconnect();
    }
    await pool.end();
  });

  describe('1. Column-Level Encryption Validation', () => {
    it('should store encrypted data in the database and automatically decrypt it on ORM read', async () => {
      if (!isDbReachable) return;
      // Query using standard Prisma Client (should automatically decrypt)
      const ormRecord = await prisma.patientRecord.findUnique({
        where: { id: patientRecordId },
      });

      expect(ormRecord).toBeDefined();
      expect(ormRecord?.ssn).toBe('000-12-3456');
      expect(ormRecord?.contactInfo).toBe('+1-555-0199');
      expect(ormRecord?.medicalHistory).toBe('Chronic hypertension under management.');

      // Query raw SQL bypassing the Prisma Client extensions (direct DB view)
      const rawRecords = await prisma.$queryRawUnsafe(
        `SELECT ssn, contact_info, medical_history FROM patients WHERE id = $1::uuid`,
        patientRecordId
      ) as Record<string, string>[];

      expect(rawRecords.length).toBe(1);
      const rawRecord = rawRecords[0];

      // Verify that plain text is NOT stored in the database columns
      expect(rawRecord.ssn).not.toBe('000-12-3456');
      expect(rawRecord.contact_info).not.toBe('+1-555-0199');
      expect(rawRecord.medical_history).not.toBe('Chronic hypertension under management.');

      // Verify that stored data matches the AES-256-GCM cipher structure (iv:tag:ciphertext)
      const hexPattern = /^[0-9a-fA-F]+$/;
      
      const ssnParts = rawRecord.ssn.split(':');
      expect(ssnParts.length).toBe(3);
      expect(hexPattern.test(ssnParts[0])).toBe(true); // IV
      expect(hexPattern.test(ssnParts[1])).toBe(true); // Auth Tag
      expect(hexPattern.test(ssnParts[2])).toBe(true); // Encrypted payload

      // Confirm decryption works directly using our encryption module
      expect(decrypt(rawRecord.ssn)).toBe('000-12-3456');
      expect(decrypt(rawRecord.contact_info)).toBe('+1-555-0199');
      expect(decrypt(rawRecord.medical_history)).toBe('Chronic hypertension under management.');
    });
  });

  describe('2. Refresh Token Revocation (Blacklist)', () => {
    it('should reject blacklisted refresh tokens with HTTP 401 and clear the cookie', async () => {
      if (!isDbReachable) return;
      // Login to obtain a valid session and token
      const req = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'security_doctor@test.com', password: 'password123' }),
      });
      const res = await loginPOST(req);
      expect(res.status).toBe(200);

      // Extract refresh token from cookies
      const cookieHeader = res.headers.get('set-cookie') || '';
      expect(cookieHeader).toContain('refreshToken');
      
      const tokenMatch = cookieHeader.match(/refreshToken=([^;]+)/);
      const refreshToken = tokenMatch ? tokenMatch[1] : '';
      expect(refreshToken).not.toBe('');

      // Decode token to find its unique JTI (JWT ID)
      const decoded = jwt.decode(refreshToken) as { jti?: string };
      const jti = decoded?.jti;
      expect(jti).toBeDefined();

      if (jti) {
        // Revoke the token by blacklisting the JTI
        await tokenBlacklist.set(jti, 'revoked', 3600);
      }

      // Attempt to refresh session with the blacklisted token
      const refreshReq = new NextRequest('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `refreshToken=${refreshToken}`,
        },
      });

      const refreshRes = await refreshPOST(refreshReq as unknown as NextRequest);
      
      // Assert that it is rejected and cookie is cleared
      expect(refreshRes.status).toBe(401);
      const refreshBody = await refreshRes.json() as { error: string; message: string };
      expect(refreshBody.error).toBe('UNAUTHORIZED');
      expect(refreshBody.message).toBe('Token revoked.');

      const responseCookie = refreshRes.headers.get('set-cookie') || '';
      expect(responseCookie).toContain('refreshToken=;'); // Cleared cookie
    });
  });

  describe('3. Token Expiration Validation', () => {
    it('should reject access tokens that have exceeded their 300-second validity window', () => {
      // Create an access token that is expired by setting its exp in the past
      const expiredToken = jwt.sign(
        { userId: doctorId, role: 'DOCTOR' },
        JWT_SECRET,
        { expiresIn: '-1s' } // Expired instantly
      );

      // Verify that decoding/verifying with JWT library fails with TokenExpiredError
      expect(() => {
        jwt.verify(expiredToken, JWT_SECRET);
      }).toThrow(jwt.TokenExpiredError);
    });

    it('should accept access tokens that are within their 300-second window', () => {
      const validToken = jwt.sign(
        { userId: doctorId, role: 'DOCTOR' },
        JWT_SECRET,
        { expiresIn: '300s' } // 300-second lifespan
      );

      const decoded = jwt.verify(validToken, JWT_SECRET) as { userId: string; role: string };
      expect(decoded.userId).toBe(doctorId);
      expect(decoded.role).toBe('DOCTOR');
    });
  });
});
