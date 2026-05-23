"use client";

import React from 'react';
import { Diagnosis } from '@/lib/mockData';
import { HeartPulse, ShieldAlert } from 'lucide-react';

interface PatientRiskAlertsProps {
  diagnoses: Diagnosis[];
}

export default function PatientRiskAlerts({ diagnoses }: PatientRiskAlertsProps) {
  // Simple risk heuristic based on mock data
  const hasDiabetes = diagnoses.some(d => d.icd10.startsWith('E11'));
  const hasHypertension = diagnoses.some(d => d.icd10.startsWith('I10'));
  
  const highRisks = [];
  
  if (hasDiabetes && hasHypertension) {
    highRisks.push({
      title: "Elevated Cardiovascular Risk",
      description: "The combination of Type 2 Diabetes and Hypertension increases your risk for heart-related events. Please ensure you are strictly following your prescribed medication regimen and diet.",
      icon: HeartPulse,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-200"
    });
  }

  if (highRisks.length === 0) {
    return null; // Hide if no high risks
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-xl border border-gray-100 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <ShieldAlert className="text-red-500" size={24} />
        <h3 className="text-xl font-bold text-gray-900">Health Risk Alerts</h3>
      </div>
      
      <div className="space-y-4">
        {highRisks.map((risk, idx) => {
          const Icon = risk.icon;
          return (
            <div key={idx} className={`p-5 rounded-2xl border ${risk.border} ${risk.bg} flex gap-4 items-start`}>
              <div className={`mt-1 bg-white p-2 rounded-full shadow-sm ${risk.color}`}>
                <Icon size={24} />
              </div>
              <div>
                <h4 className={`text-lg font-bold ${risk.color} mb-1`}>{risk.title}</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {risk.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
