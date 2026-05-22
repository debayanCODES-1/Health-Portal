"use client";

import React, { useState } from 'react';
import { Diagnosis } from '@/lib/mockData';
import { Stethoscope, ActivitySquare, ShieldCheck, Archive } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DiagnosisTrackerProps {
  diagnoses: Diagnosis[];
}

type Tab = 'Active' | 'Monitoring' | 'Inactive';

export default function DiagnosisTracker({ diagnoses }: DiagnosisTrackerProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Active');

  const filteredDiagnoses = diagnoses.filter(d => d.status === activeTab);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'Active', label: 'Active', icon: ActivitySquare },
    { id: 'Monitoring', label: 'Monitoring', icon: ShieldCheck },
    { id: 'Inactive', label: 'Inactive', icon: Archive },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <Stethoscope className="text-blue-500" size={24} />
        <h3 className="text-xl font-bold text-gray-900">Diagnosis Tracking</h3>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 bg-gray-100/50 p-1.5 rounded-xl mb-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={twMerge(
                "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-200",
                isActive 
                  ? "bg-white text-blue-600 shadow-sm ring-1 ring-black/5" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {filteredDiagnoses.length > 0 ? (
          <div className="space-y-3">
            {filteredDiagnoses.map((diag) => (
              <div key={diag.id} className="p-4 rounded-xl border border-gray-100 bg-white hover:border-blue-200 transition-colors group">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{diag.condition}</h4>
                    <p className="text-xs text-gray-500 mt-1">Diagnosed: {diag.diagnosedDate}</p>
                  </div>
                  <div className="shrink-0 bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md border border-blue-100">
                    {diag.icd10}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm italic">
            No {activeTab.toLowerCase()} diagnoses found.
          </div>
        )}
      </div>
    </div>
  );
}
