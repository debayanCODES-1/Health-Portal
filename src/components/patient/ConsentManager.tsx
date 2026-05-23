"use client";

import React, { useState } from 'react';
import { Shield, CheckCircle2, XCircle, Building2, User } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type ConsentEntity = {
  id: string;
  name: string;
  type: 'Hospital' | 'Doctor';
  hasAccess: boolean;
};

const initialConsents: ConsentEntity[] = [
  { id: 'h1', name: 'Apollo Hospitals', type: 'Hospital', hasAccess: true },
  { id: 'd1', name: 'Dr. Sharma (Cardiology)', type: 'Doctor', hasAccess: false },
  { id: 'h2', name: 'Fortis Healthcare', type: 'Hospital', hasAccess: true },
];

export default function ConsentManager() {
  const [consents, setConsents] = useState<ConsentEntity[]>(initialConsents);

  const toggleConsent = (id: string) => {
    setConsents(prev => 
      prev.map(c => c.id === id ? { ...c, hasAccess: !c.hasAccess } : c)
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-gray-100 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
        <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
          <Shield size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Consent & Access Management</h2>
          <p className="text-gray-500 mt-1 text-sm">Control who can view your longitudinal health records.</p>
        </div>
      </div>

      <div className="space-y-4">
        {consents.map((entity) => (
          <div key={entity.id} className="flex items-center justify-between p-5 rounded-2xl border border-gray-200 bg-white hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-500">
                {entity.type === 'Hospital' ? <Building2 size={20} /> : <User size={20} />}
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{entity.name}</h4>
                <p className="text-xs text-gray-500">{entity.type}</p>
              </div>
            </div>
            
            <button
              onClick={() => toggleConsent(entity.id)}
              className={twMerge(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 border",
                entity.hasAccess
                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
              )}
            >
              {entity.hasAccess ? (
                <>
                  <XCircle size={18} />
                  <span>Revoke Access</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Grant Access</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
