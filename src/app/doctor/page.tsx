"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import PatientHeader from '@/components/doctor/PatientHeader';
import VitalsDashboard from '@/components/doctor/VitalsDashboard';
import MedicalStatus from '@/components/doctor/MedicalStatus';
import DiagnosisTracker from '@/components/doctor/DiagnosisTracker';
import PastHistoryTimeline from '@/components/doctor/PastHistoryTimeline';
import LabReports from '@/components/doctor/LabReports';
import EPrescription from '@/components/doctor/EPrescription';
import { LogOut, Loader2 } from 'lucide-react';

export default function DoctorDashboard() {
  const { authState, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authState.isAuthenticated || authState.role !== 'doctor') {
      router.push('/login?role=doctor');
      return;
    }

    // Fetch from Supabase API
    fetch('/api/patient-data')
      .then(res => res.json())
      .then(result => {
        if (result.error) {
          console.error("API Error:", result.error);
        } else {
          setData(result);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  }, [authState, router]);

  if (!authState.isAuthenticated || authState.role !== 'doctor') {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Navbar */}
        <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-blue-900">Dr. Dashboard</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors font-medium text-sm">
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-blue-600">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="text-lg font-bold">Loading Patient Records from Database...</p>
          </div>
        ) : data ? (
          <>
            <PatientHeader patient={data.patient} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              <div className="lg:col-span-2 flex flex-col gap-6">
                <VitalsDashboard vitals={data.vitals} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
                  <MedicalStatus status={data.medicalStatus} />
                  <DiagnosisTracker diagnoses={data.diagnoses} />
                </div>
                <div className="h-[400px]">
                  <EPrescription pastPrescriptions={data.prescriptions} />
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="h-[400px]">
                  <PastHistoryTimeline history={data.medicalHistory} />
                </div>
                <div className="flex-1 min-h-[400px]">
                  <LabReports reports={data.labReports} />
                </div>
              </div>
              
            </div>
          </>
        ) : (
          <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-200">
            Failed to load patient records. Ensure Supabase tables are created.
          </div>
        )}

      </div>
    </div>
  );
}
