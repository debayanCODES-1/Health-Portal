import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { abhaId, name, age, bloodGroup } = body;

    if (!abhaId || !name || !age || !bloodGroup) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert new patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .insert({
        abha_id: abhaId,
        name,
        age,
        blood_group: bloodGroup
      })
      .select()
      .single();

    if (patientError) {
      // Handle unique constraint error
      if (patientError.code === '23505') {
        return NextResponse.json({ error: 'A patient with this Aadhar already exists.' }, { status: 400 });
      }
      throw patientError;
    }

    return NextResponse.json({ success: true, patient });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
