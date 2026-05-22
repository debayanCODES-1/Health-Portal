"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ConsentManager from '@/components/patient/ConsentManager';
import PatientRiskAlerts from '@/components/patient/PatientRiskAlerts';
import PatientRecordsView from '@/components/patient/PatientRecordsView';
import { mockDiagnoses, mockPrescriptions, mockLabReports } from '@/lib/mockData';
import { LogOut } from 'lucide-react';

export default function PatientDashboard() {
  const { authState, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authState.isAuthenticated || authState.role !== 'patient') {
      router.push('/login?role=patient');
    }
  }, [authState, router]);

  if (!authState.isAuthenticated || authState.role !== 'patient') {
    return null; // or a loading spinner
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

        {/* High Risk Alerts */}
        <PatientRiskAlerts diagnoses={mockDiagnoses} />

        {/* Consent Manager */}
        <ConsentManager />

        {/* Comprehensive Patient Records View */}
        <PatientRecordsView 
          diagnoses={mockDiagnoses}
          prescriptions={mockPrescriptions}
          reports={mockLabReports}
        />

      </div>
    </div>
  );
}
