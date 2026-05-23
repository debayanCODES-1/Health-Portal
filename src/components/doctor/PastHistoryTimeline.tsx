"use client";

import React from 'react';
import { MedicalHistoryEvent } from '@/lib/mockData';
import { Clock, Building2 } from 'lucide-react';

interface PastHistoryTimelineProps {
  history: MedicalHistoryEvent[];
}

export default function PastHistoryTimeline({ history }: PastHistoryTimelineProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="text-blue-500" size={24} />
        <h3 className="text-xl font-bold text-gray-900">Past Medical History</h3>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-blue-100 before:to-transparent">
        <div className="space-y-6">
          {history.map((item) => (
            <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              {/* Timeline Dot */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 ml-0 md:ml-0 md:absolute md:left-1/2">
                <div className="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>
              </div>
              
              {/* Card */}
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 border-l-2 border-transparent relative">
                <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <span className="inline-block px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md mb-2">
                    {item.date}
                  </span>
                  <h4 className="font-bold text-gray-900 mb-1">{item.event}</h4>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <Building2 size={14} />
                    <span>{item.hospitalName}</span>
                  </div>
                  {/* Privacy Constraint: Attending Doctor's Name is strictly hidden/omitted. */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
