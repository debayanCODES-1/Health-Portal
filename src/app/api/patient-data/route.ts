import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const abhaId = searchParams.get('abhaId') || '91-1234-5678-9012';

  try {
    // 1. Fetch Patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('abha_id', abhaId)
      .single();

    if (patientError || !patient) throw new Error('Patient not found');

    const patientId = patient.id;

    // 2. Fetch related data
    const [
      { data: vitals },
      { data: medicalStatus },
      { data: diagnoses },
      { data: medicalHistory },
      { data: labReports },
      { data: prescriptions }
    ] = await Promise.all([
      supabase.from('vitals').select('*').eq('patient_id', patientId).single(),
      supabase.from('medical_status').select('*').eq('patient_id', patientId).single(),
      supabase.from('diagnoses').select('*').eq('patient_id', patientId),
      supabase.from('medical_history').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
      supabase.from('lab_reports').select('*').eq('patient_id', patientId).order('date', { ascending: false }),
      supabase.from('prescriptions').select('*').eq('patient_id', patientId).order('date', { ascending: false })
    ]);

    // 3. ENFORCE PRIVACY CONSTRAINT: Strip out `attending_doctor` from Medical History
    const sanitizedHistory = medicalHistory?.map(historyItem => {
      // Create a copy without attending_doctor
      const { attending_doctor, ...safeItem } = historyItem;
      return safeItem;
    });

    // 4. Construct payload (mapping to frontend types)
    const payload = {
      patient: {
        id: patient.id,
        name: patient.name,
        age: patient.age,
        bloodGroup: patient.blood_group,
        abhaId: patient.abha_id
      },
      vitals: vitals ? {
        bloodSugar: vitals.blood_sugar,
        heartRate: vitals.heart_rate,
        bloodPressure: vitals.blood_pressure,
        bmi: vitals.bmi,
        spO2: vitals.sp_o2,
        lastUpdated: vitals.last_updated
      } : null,
      medicalStatus: medicalStatus ? {
        activeMedications: medicalStatus.active_medications,
        knownAllergies: medicalStatus.known_allergies
      } : null,
      diagnoses: diagnoses || [],
      medicalHistory: sanitizedHistory || [],
      labReports: labReports || [],
      prescriptions: prescriptions || []
    };

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
