"use client";

import React, { useState } from 'react';
import { Diagnosis, Prescription, LabReport } from '@/lib/mockData';
import { ActivitySquare, Pill, FileText, ChevronRight } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface PatientRecordsViewProps {
  diagnoses: Diagnosis[];
  prescriptions: Prescription[];
  reports: LabReport[];
}

type Tab = 'DISEASES' | 'PRESCRIPTIONS' | 'REPORTS';

export default function PatientRecordsView({ diagnoses, prescriptions, reports }: PatientRecordsViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('DISEASES');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'DISEASES', label: 'Clinical Diseases', icon: ActivitySquare },
    { id: 'PRESCRIPTIONS', label: 'Prescriptions', icon: Pill },
    { id: 'REPORTS', label: 'Lab Reports', icon: FileText },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-xl border border-gray-100 max-w-3xl mx-auto mt-6">
      <div className="flex flex-wrap gap-2 mb-6 bg-gray-100/50 p-1.5 rounded-2xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={twMerge(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200",
                isActive 
                  ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5" 
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[300px]">
        {/* Diseases View */}
        {activeTab === 'DISEASES' && (
          <div className="space-y-4">
            {diagnoses.map(diag => (
              <div key={diag.id} className="p-5 rounded-2xl border border-gray-100 hover:border-indigo-200 bg-white transition-colors group">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{diag.condition}</h4>
                    <p className="text-sm text-gray-500 mt-1">Diagnosed: {diag.diagnosedDate}</p>
                  </div>
                  <div className={twMerge(
                    "px-3 py-1 text-xs font-bold rounded-lg border",
                    diag.status === 'Active' ? "bg-red-50 text-red-700 border-red-100" :
                    diag.status === 'Monitoring' ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-gray-50 text-gray-700 border-gray-200"
                  )}>
                    {diag.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Prescriptions View */}
        {activeTab === 'PRESCRIPTIONS' && (
          <div className="space-y-4">
            {prescriptions.map(pr => (
              <div key={pr.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-200 transition-colors">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-50">
                  <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">Date: {pr.date}</span>
                </div>
                <div className="space-y-2 mb-4">
                  <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prescribed Medications</h5>
                  <ul className="space-y-2">
                    {pr.medications.map((med, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-gray-800 font-medium">
                        <Pill size={16} className="text-gray-400" />
                        {med}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-xs font-bold text-gray-500 uppercase">Doctor's Notes: </span>
                  <span className="text-sm text-gray-700 italic">{pr.notes}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lab Reports View */}
        {activeTab === 'REPORTS' && (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="p-5 rounded-2xl border border-gray-100 bg-white hover:border-indigo-200 transition-colors flex items-center justify-between group cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg group-hover:text-indigo-600 transition-colors">{report.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">Date: {report.date}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{report.summary}</p>
                  </div>
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
