"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ConsentManager from '@/components/patient/ConsentManager';
import PatientRiskAlerts from '@/components/patient/PatientRiskAlerts';
import PatientRecordsView from '@/components/patient/PatientRecordsView';
import { LogOut, Loader2 } from 'lucide-react';

export default function PatientDashboard() {
  const { authState, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authState.isAuthenticated || authState.role !== 'patient') {
      router.push('/login?role=patient');
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

  if (!authState.isAuthenticated || authState.role !== 'patient') {
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
        <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
          <h1 className="text-xl font-bold text-indigo-900">Patient Dashboard</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors font-medium text-sm">
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-600">
            <Loader2 className="animate-spin mb-4" size={48} />
            <p className="text-lg font-bold">Loading Your Health Records...</p>
          </div>
        ) : data ? (
          <>
            {/* High Risk Alerts */}
            <PatientRiskAlerts diagnoses={data.diagnoses} />

            {/* Consent Manager */}
            <ConsentManager />

            {/* Comprehensive Patient Records View */}
            <PatientRecordsView 
              diagnoses={data.diagnoses}
              prescriptions={data.prescriptions}
              reports={data.labReports}
            />
          </>
        ) : (
          <div className="p-8 text-center bg-red-50 text-red-600 rounded-2xl border border-red-200 max-w-3xl mx-auto">
            Failed to load health records. Ensure Supabase tables are created.
          </div>
        )}

      </div>
    </div>
  );
}
