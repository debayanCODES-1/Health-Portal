"use client";

import React from 'react';
import { LabReport } from '@/lib/mockData';
import { FileText, Sparkles } from 'lucide-react';

interface LabReportsProps {
  reports: LabReport[];
}

export default function LabReports({ reports }: LabReportsProps) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="text-blue-500" size={24} />
          <h3 className="text-xl font-bold text-gray-900">Lab Reports</h3>
        </div>
        <span className="text-sm font-medium text-gray-500">{reports.length} Reports</span>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <div key={report.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white hover:border-blue-200 transition-colors">
            <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-gray-900">{report.title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{report.date}</p>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                View Full
              </button>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-1">AI Summary</h5>
                  <p className="text-sm text-gray-700 leading-relaxed">{report.summary}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
