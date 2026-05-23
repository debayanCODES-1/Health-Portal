import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MedicalHistory, Diagnosis, LabReport, Prescription } from '@prisma/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const abhaId = searchParams.get('abhaId') || '91-1234-5678-9012';

  try {
    // 1. Fetch Patient with related data using Prisma
    const patient = await prisma.patientRecord.findUnique({
      where: { abhaId },
      include: {
        vitals: {
          orderBy: { lastUpdated: 'desc' },
          take: 1,
        },
        medicalStatus: true,
        diagnoses: true,
        medicalHistoryRecords: {
          orderBy: { date: 'desc' },
        },
        labReports: {
          orderBy: { date: 'desc' },
        },
        prescriptions: {
          orderBy: { date: 'desc' },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // 2. Fetch vitals (take latest)
    const latestVitals = patient.vitals[0] || null;

    // 3. ENFORCE PRIVACY CONSTRAINT: Strip out `attendingDoctor` from Medical History
    const sanitizedHistory = patient.medicalHistoryRecords.map((historyItem: MedicalHistory) => {
      // Create a copy without attendingDoctor to avoid unused variable warnings
      const itemCopy = { ...historyItem } as Record<string, unknown>;
      delete itemCopy.attendingDoctor;
      return itemCopy;
    });

    // 4. Construct payload (mapping to frontend types and expectations)
    const payload = {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        bloodGroup: patient.bloodGroup,
        abhaId: patient.abhaId,
      },
      vitals: latestVitals ? {
        bloodSugar: latestVitals.bloodSugar ?? 0,
        heartRate: latestVitals.heartRate ?? 0,
        bloodPressure: latestVitals.bloodPressure ?? '',
        bmi: latestVitals.bmi ? Number(latestVitals.bmi) : 0,
        spO2: latestVitals.spO2 ?? 0,
        lastUpdated: latestVitals.lastUpdated.toISOString(),
      } : null,
      medicalStatus: patient.medicalStatus ? {
        activeMedications: patient.medicalStatus.activeMedications,
        knownAllergies: patient.medicalStatus.knownAllergies,
      } : null,
      diagnoses: patient.diagnoses.map((d: Diagnosis) => ({
        id: d.id,
        condition: d.condition,
        icd10: d.icd10,
        status: d.status as 'Active' | 'Inactive' | 'Monitoring',
        diagnosedDate: d.diagnosedDate.toISOString().split('T')[0],
      })),
      medicalHistory: sanitizedHistory.map((h: Record<string, unknown>) => {
        const item = h as unknown as MedicalHistory;
        return {
          id: item.id,
          date: item.date.toISOString().split('T')[0],
          hospitalName: item.hospitalName,
          event: item.event,
        };
      }),
      labReports: patient.labReports.map((l: LabReport) => ({
        id: l.id,
        date: l.date.toISOString().split('T')[0],
        title: l.title,
        summary: l.summary,
      })),
      prescriptions: patient.prescriptions.map((pr: Prescription) => ({
        id: pr.id,
        date: pr.date.toISOString().split('T')[0],
        medications: pr.medications,
        notes: pr.notes,
      })),
    };

    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to retrieve patient data:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
