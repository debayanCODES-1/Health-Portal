"use client";

import React from 'react';
import { Vitals } from '@/lib/mockData';
import { Activity, Heart, Droplets, Scale, Wind } from 'lucide-react';

interface VitalsDashboardProps {
  vitals: Vitals;
}

export default function VitalsDashboard({ vitals }: VitalsDashboardProps) {
  const cards = [
    { label: 'Blood Sugar', value: `${vitals.bloodSugar} mg/dL`, icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Heart Rate', value: `${vitals.heartRate} bpm`, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Blood Pressure', value: vitals.bloodPressure, icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'BMI', value: vitals.bmi, icon: Scale, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'SpO2', value: `${vitals.spO2}%`, icon: Wind, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Clinical Vitals</h3>
        <span className="text-xs text-gray-500 font-medium">Last updated: {new Date(vitals.lastUpdated).toLocaleString()}</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all group bg-white">
              <div className={`w-10 h-10 rounded-lg ${card.bg} ${card.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
              </div>
              <p className="text-sm font-medium text-gray-500 mb-1">{card.label}</p>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
