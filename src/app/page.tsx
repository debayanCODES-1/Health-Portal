"use client";

import Link from 'next/link';
import { Stethoscope, UserCircle2, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl w-full relative z-10 text-center">
        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Patient Brief</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Secure, unified access to patient medical histories. Select your portal to continue.
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {/* Doctor Portal Card */}
          <Link href="/login?role=doctor" className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <Stethoscope size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Doctor Portal</h2>
            <p className="text-gray-500 mb-6">Access patient records, vitals, and issue E-Prescriptions securely.</p>
            <div className="mt-auto flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
              <span>Enter Portal</span>
              <ArrowRight size={18} />
            </div>
          </Link>

          {/* Patient Portal Card */}
          <Link href="/login?role=patient" className="group relative bg-white/80 backdrop-blur-xl p-8 rounded-3xl shadow-lg border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
              <UserCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Portal</h2>
            <p className="text-gray-500 mb-6">Manage your consent, view your records, and control data access.</p>
            <div className="mt-auto flex items-center gap-2 text-indigo-600 font-semibold group-hover:gap-3 transition-all">
              <span>Enter Portal</span>
              <ArrowRight size={18} />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
