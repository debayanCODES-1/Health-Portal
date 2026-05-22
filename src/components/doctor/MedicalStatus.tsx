"use client";

import React from 'react';
import { MedicalStatus as MedicalStatusType } from '@/lib/mockData';
import { Pill, AlertTriangle } from 'lucide-react';

interface MedicalStatusProps {
  status: MedicalStatusType;
}

export default function MedicalStatus({ status }: MedicalStatusProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
      
      {/* Known Allergies - Red Warning Banner */}
      {status.knownAllergies.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="text-red-800 font-bold text-sm uppercase tracking-wider mb-1">Known Allergies</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {status.knownAllergies.map((allergy, idx) => (
                <span key={idx} className="bg-white text-red-700 px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-red-100">
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Medications */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Pill className="text-blue-500" size={20} />
          <h3 className="text-lg font-bold text-gray-900">Active Medications</h3>
        </div>
        <div className="grid gap-3">
          {status.activeMedications.length > 0 ? (
            status.activeMedications.map((med, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                <span className="font-medium text-gray-700">{med}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">No active medications.</p>
          )}
        </div>
      </div>
      
    </div>
  );
}
