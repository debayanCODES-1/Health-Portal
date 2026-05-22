"use client";

import React from 'react';
import { Patient } from '@/lib/mockData';
import { User, Activity, Droplet, Hash } from 'lucide-react';

interface PatientHeaderProps {
  patient: Patient;
}

export default function PatientHeader({ patient }: PatientHeaderProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
          <User size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 font-medium">
            <span className="flex items-center gap-1.5"><Activity size={16} className="text-gray-400" /> {patient.age} Yrs</span>
            <span className="flex items-center gap-1.5"><Droplet size={16} className="text-red-400" /> {patient.bloodGroup}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-blue-50 px-5 py-3 rounded-xl border border-blue-100">
        <Hash size={20} className="text-blue-500" />
        <div>
          <p className="text-xs text-blue-500 font-semibold uppercase tracking-wider">ABHA ID</p>
          <p className="text-lg font-bold text-blue-700 tracking-wide">{patient.abhaId}</p>
        </div>
      </div>
    </div>
  );
}
