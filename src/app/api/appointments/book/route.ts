/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client'; // Force IDE reload

interface AppointmentSlot {
  id: string;
  status: string;
}

/**
 * Endpoint for booking appointments with concurrency control.
 * 
 * Locking Strategy:
 * - Uses pessimistic write locking via PostgreSQL `SELECT ... FOR UPDATE NOWAIT` within an interactive transaction block.
 * - By executing `NOWAIT`, any transaction attempting to lock the same appointment slot (doctorId, timeslot) 
 *   or doctor record will fail immediately with code '55P03' rather than blocking indefinitely.
 * - If the row does not yet exist, a unique constraint on `(doctorId, timeslot)` prevents duplicate inserts,
 *   throwing a unique violation exception.
 * 
 * Retry Backoff Parameters:
 * - Max Retries: 3 (4 total attempts)
 * - Base Delay: 100ms
 * - Growth Factor: Exponential (2^attempt) -> 100ms, 200ms, 400ms
 * - Serialization error (40001), lock error (55P03), and unique constraint error (23505/P2002) trigger retries.
 * - If all retries fail, returns HTTP 409 Conflict with SLOT_UNAVAILABLE code.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { doctorId, timeslot, patientId } = body;

    if (!doctorId || !timeslot || !patientId) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Missing doctorId, timeslot, or patientId.' },
        { status: 400 }
      );
    }

    const maxRetries = 3;
    let delay = 100;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const appointment = await prisma.$transaction(async (tx: any) => {
          // 1. Acquire pessimistic write lock using SELECT FOR UPDATE NOWAIT
          const slots = await tx.$queryRaw<AppointmentSlot[]>`
            SELECT id, status FROM appointments
            WHERE doctor_id = ${doctorId}::uuid AND timeslot = ${timeslot}::timestamptz
            FOR UPDATE NOWAIT
          `;

          if (slots.length > 0) {
            const slot = slots[0];
            if (slot.status === 'BOOKED') {
              throw new Error('SLOT_ALREADY_BOOKED');
            }

            // Update slot status to BOOKED and assign patient
            const updated = await tx.appointment.update({
              where: { id: slot.id },
              data: {
                patientId,
                status: 'BOOKED',
              },
            });

            // Create Transaction record
            await tx.transaction.create({
              data: {
                appointmentId: updated.id,
                amount: 150.00,
                status: 'COMPLETED',
              },
            });

            return updated;
          } else {
            // Slot does not exist yet. Insert new appointment directly as BOOKED.
            // If another thread is concurrently doing this, one will fail with a unique constraint.
            const newAppointment = await tx.appointment.create({
              data: {
                doctorId,
                patientId,
                timeslot: new Date(timeslot),
                status: 'BOOKED',
              },
            });

            // Create Transaction record
            await tx.transaction.create({
              data: {
                appointmentId: newAppointment.id,
                amount: 150.00,
                status: 'COMPLETED',
              },
            });

            return newAppointment;
          }
        }, {
          isolationLevel: 'ReadCommitted', 
        });

        return NextResponse.json(appointment, { status: 201 });

      } catch (error) {
        const prismaError = error as Prisma.PrismaClientKnownRequestError & { meta?: { message?: string } };
        // Check for concurrency conflict errors
        const isLockConflict = prismaError.code === 'P2010' && prismaError.meta?.message?.includes('55P03');
        const isSerializationFailure = prismaError.code === 'P2010' && prismaError.meta?.message?.includes('40001');
        const isUniqueConstraint = prismaError.code === 'P2002';

        const errMsg = prismaError.message || '';
        const isConflictError =
          isLockConflict ||
          isSerializationFailure ||
          isUniqueConstraint ||
          errMsg.includes('55P03') ||
          errMsg.includes('40001') ||
          errMsg.includes('23505') ||
          errMsg.includes('unique constraint') ||
          errMsg.includes('lock not available');

        if (errMsg === 'SLOT_ALREADY_BOOKED') {
          return NextResponse.json(
            { error: 'SLOT_UNAVAILABLE', message: 'This slot was just booked.' },
            { status: 409 }
          );
        }

        if (isConflictError && attempt < maxRetries) {
          // Wait for the backoff period before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
          continue;
        }

        // If we ran out of retries, or it's a non-retryable error, throw it
        throw error;
      }
    }
    
    // If we exited the loop without returning or throwing a specific error
    return NextResponse.json(
      { error: 'SLOT_UNAVAILABLE', message: 'This slot was just booked.' },
      { status: 409 }
    );
  } catch (error) {
    console.error('Booking transaction failure:', error);
    return NextResponse.json(
      { error: 'SLOT_UNAVAILABLE', message: 'This slot was just booked.' },
      { status: 409 }
    );
  }
}
