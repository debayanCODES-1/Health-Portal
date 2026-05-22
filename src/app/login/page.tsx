"use client";

import { useSearchParams } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { UserRole } from '@/context/AuthContext';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  
  // Default to patient if invalid or missing
  const role: UserRole = roleParam === 'doctor' ? 'doctor' : 'patient';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full relative z-10">
        <AuthForm role={role} />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
