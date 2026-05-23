import { POST as webhookPOST } from './webhook/route';
import { withIdempotency } from '@/lib/idempotency';
import { prisma, pool } from '@/lib/prisma';
import { NextResponse } from 'next/server';

describe('Payments & Idempotency Integration Test Suite', () => {
  let isDbReachable = false;
  let doctorId: string;
  let patientId: string;
  let appointmentId: string;

  beforeAll(async () => {
    try {
      const client = await pool.connect();
      client.release();
      isDbReachable = true;
    } catch {
      console.warn("TEST DATABASE WARNING: Could not connect to PostgreSQL. Skipping database payments assertions.");
    }

    if (!isDbReachable) {
      return;
    }

    // Seed test users
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE transactions CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE appointments CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE patients CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE users CASCADE;`);

      const doctor = await prisma.user.create({
        data: {
          email: 'webhook_doctor@test.com',
          name: 'Dr. Webhook',
          password: 'password123',
          role: 'DOCTOR',
        },
      });
      doctorId = doctor.id;

      const patient = await prisma.user.create({
        data: {
          email: 'webhook_patient@test.com',
          name: 'Patient Webhook',
          password: 'password123',
          role: 'PATIENT',
        },
      });
      patientId = patient.id;
    } catch (e) {
      console.error("Test database seeding failed:", e);
    }
  });

  afterAll(async () => {
    if (isDbReachable) {
      await prisma.$disconnect();
    }
    await pool.end();
  });

  describe('1. Global Idempotency Middleware', () => {
    it('should only process unique requests once, returning cached responses for duplicates', async () => {
      let callCount = 0;
      const controller = async (req: Request) => {
        callCount++;
        const body = await req.json();
        return NextResponse.json({ success: true, count: callCount, echoed: body.data }, { status: 201 });
      };

      const handler = withIdempotency(controller);
      const key = '44444444-4444-4444-8888-999999999999';

      // Request 1: initial submission
      const req1 = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': key,
        },
        body: JSON.stringify({ data: 'hello' }),
      });

      const res1 = await handler(req1);
      expect(res1.status).toBe(201);
      expect(res1.headers.get('X-Cache-Lookup')).toBe('MISS');
      const body1 = await res1.json();
      expect(body1).toEqual({ success: true, count: 1, echoed: 'hello' });
      expect(callCount).toBe(1);

      // Request 2: duplicate submission (network drop retry)
      const req2 = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': key,
        },
        body: JSON.stringify({ data: 'hello' }),
      });

      const res2 = await handler(req2);
      expect(res2.status).toBe(201);
      expect(res2.headers.get('X-Cache-Lookup')).toBe('HIT');
      const body2 = await res2.json();
      expect(body2).toEqual({ success: true, count: 1, echoed: 'hello' });
      expect(callCount).toBe(1); // Controller not run again
    });

    it('should reject requests with missing or invalid UUIDv4 idempotency keys', async () => {
      const controller = async () => NextResponse.json({ ok: true }, { status: 200 });
      const handler = withIdempotency(controller);

      // Missing header
      const req1 = new Request('http://localhost/api/test', { method: 'POST' });
      const res1 = await handler(req1);
      expect(res1.status).toBe(400);

      // Invalid format key
      const req2 = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'X-Idempotency-Key': 'not-a-uuid' },
      });
      const res2 = await handler(req2);
      expect(res2.status).toBe(400);
    });
  });

  describe('2. Webhook Signature Verification and Integrity', () => {
    beforeEach(async () => {
      if (!isDbReachable) return;

      await prisma.$executeRawUnsafe(`TRUNCATE TABLE transactions CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE appointments CASCADE;`);

      const appointment = await prisma.appointment.create({
        data: {
          doctorId,
          patientId,
          timeslot: new Date('2026-07-01T14:00:00.000Z'),
          status: 'AVAILABLE',
        },
      });
      appointmentId = appointment.id;

      await prisma.transaction.create({
        data: {
          appointmentId: appointment.id,
          amount: 150.00,
          status: 'PENDING',
        },
      });
    });

    it('should reject Stripe webhooks with invalid signatures and leave the database untouched', async () => {
      if (!isDbReachable) return;

      const payload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              appointmentId: appointmentId,
            },
          },
        },
      };

      const req = new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'invalid_sig',
        },
        body: JSON.stringify(payload),
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('BAD_REQUEST');
      expect(body.message).toContain('Invalid webhook signature');

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appointment?.status).toBe('AVAILABLE');
    });

    it('should successfully verify a webhook with a valid signature and update the appointment and transaction status to PAID/COMPLETED in a transaction', async () => {
      if (!isDbReachable) return;

      const payload = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: {
              appointmentId: appointmentId,
            },
          },
        },
      };

      const req = new Request('http://localhost/api/payments/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'stripe-signature': 'valid_mock_signature',
        },
        body: JSON.stringify(payload),
      });

      const res = await webhookPOST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.received).toBe(true);

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      });
      expect(appointment?.status).toBe('PAID');

      const transaction = await prisma.transaction.findFirst({
        where: { appointmentId },
      });
      expect(transaction?.status).toBe('COMPLETED');
    });
  });
});
