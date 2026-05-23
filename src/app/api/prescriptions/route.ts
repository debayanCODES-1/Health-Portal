import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, medications, notes } = body;

    if (!patientId || !medications || medications.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .insert({
        patient_id: patientId,
        date: new Date().toISOString().split('T')[0],
        medications,
        notes: notes || 'No additional notes.'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, prescription });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
