import { POST } from './route';
import { prisma, pool } from '@/lib/prisma';

describe('Appointment Booking Concurrency Integration Test', () => {
  let doctorId: string;
  let patientId: string;
  const timeslot = '2026-06-01T10:00:00.000Z';

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

    // Clean up any existing test data to ensure test run is deterministic
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE transactions CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE appointments CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE patients CASCADE;`);
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE users CASCADE;`);
    } catch (err) {
      console.warn("Table cleanup warning (tables might not exist yet):", err);
    }

    // Create doctor user
    const doctor = await prisma.user.create({
      data: {
        email: 'doctor@test.com',
        name: 'Dr. Test',
        password: 'password123',
        role: 'DOCTOR',
      },
    });
    doctorId = doctor.id;

    // Create patient user and record
    const patient = await prisma.user.create({
      data: {
        email: 'patient@test.com',
        name: 'Patient Test',
        password: 'password123',
        role: 'PATIENT',
      },
    });
    patientId = patient.id;

    await prisma.patientRecord.create({
      data: {
        userId: patientId,
        abhaId: '91-1111-2222-3333',
        name: 'Patient Test',
        age: 30,
        bloodGroup: 'O+',
      },
    });
  });

  afterAll(async () => {
    if (isDbReachable) {
      await prisma.$disconnect();
    }
    await pool.end();
  });

  it('should handle 50 concurrent booking attempts, allowing exactly 1 to succeed and 49 to fail with 409', async () => {
    if (!isDbReachable) {
      return; // Skip if database is unreachable
    }
    const totalWorkers = 50;
    const promises = [];

    for (let i = 0; i < totalWorkers; i++) {
      const req = new Request('http://localhost/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId, timeslot, patientId }),
      });
      promises.push(POST(req));
    }

    const responses = await Promise.all(promises);

    let successCount = 0;
    let failureCount = 0;

    for (const res of responses) {
      if (res.status === 201) {
        successCount++;
      } else if (res.status === 409) {
        failureCount++;
        const body = await res.json();
        expect(body).toEqual({
          error: 'SLOT_UNAVAILABLE',
          message: 'This slot was just booked.',
        });
      } else {
        console.error('Unexpected status:', res.status, await res.json());
      }
    }

    // Assertions
    expect(successCount).toBe(1);
    expect(failureCount).toBe(49);

    // Verify database state: exactly 1 booked appointment should exist
    const appointments = await prisma.appointment.findMany({
      where: { doctorId, timeslot: new Date(timeslot) },
    });
    expect(appointments.length).toBe(1);
    expect(appointments[0].status).toBe('BOOKED');
    expect(appointments[0].patientId).toBe(patientId);

    // Verify database state: exactly 1 transaction should exist
    const transactions = await prisma.transaction.findMany({
      where: { appointmentId: appointments[0].id },
    });
    expect(transactions.length).toBe(1);
    expect(Number(transactions[0].amount)).toBe(150.00);
    expect(transactions[0].status).toBe('COMPLETED');
  });
});
