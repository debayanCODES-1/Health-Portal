"use client";

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import PatientHeader from '@/components/doctor/PatientHeader';
import VitalsDashboard from '@/components/doctor/VitalsDashboard';
import MedicalStatus from '@/components/doctor/MedicalStatus';
import DiagnosisTracker from '@/components/doctor/DiagnosisTracker';
import PastHistoryTimeline from '@/components/doctor/PastHistoryTimeline';
import LabReports from '@/components/doctor/LabReports';
import EPrescription from '@/components/doctor/EPrescription';
import {
  mockPatient,
  mockVitals,
  mockMedicalStatus,
  mockDiagnoses,
  mockMedicalHistory,
  mockLabReports,
  mockPrescriptions
} from '@/lib/mockData';
import { LogOut } from 'lucide-react';

export default function DoctorDashboard() {
  const { authState, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authState.isAuthenticated || authState.role !== 'doctor') {
      router.push('/login?role=doctor');
    }
  }, [authState, router]);

  if (!authState.isAuthenticated || authState.role !== 'doctor') {
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
        <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-gray-100">
          <h1 className="text-xl font-bold text-blue-900">Dr. Dashboard</h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors font-medium text-sm">
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* Header Profile */}
        <PatientHeader patient={mockPatient} />

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <VitalsDashboard vitals={mockVitals} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
              <MedicalStatus status={mockMedicalStatus} />
              <DiagnosisTracker diagnoses={mockDiagnoses} />
            </div>
            <div className="h-[400px]">
              <EPrescription pastPrescriptions={mockPrescriptions} />
            </div>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <div className="h-[400px]">
              <PastHistoryTimeline history={mockMedicalHistory} />
            </div>
            <div className="flex-1 min-h-[400px]">
              <LabReports reports={mockLabReports} />
            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
