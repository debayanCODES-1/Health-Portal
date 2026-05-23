"use client";

import React, { useState } from 'react';
import { Prescription } from '@/lib/mockData';
import { PenTool, History, Send, FileSignature } from 'lucide-react';

interface EPrescriptionProps {
  patientId: string;
  pastPrescriptions: Prescription[];
  onPrescriptionAdded: () => void;
}

export default function EPrescription({ patientId, pastPrescriptions, onPrescriptionAdded }: EPrescriptionProps) {
  const [draft, setDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignAndIssue = async () => {
    if (!draft.trim()) return;
    setIsSubmitting(true);
    
    // Split draft into lines to treat as separate medications, or just treat as one medication for now
    const medications = draft.split('\n').filter(line => line.trim().length > 0);
    
    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          medications,
          notes: 'Issued via Doctor Portal'
        })
      });
      if (res.ok) {
        setDraft('');
        onPrescriptionAdded(); // Trigger re-fetch
      } else {
        console.error('Failed to issue prescription');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <FileSignature className="text-blue-500" size={24} />
        <h3 className="text-xl font-bold text-gray-900">E-Prescription Writer</h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Writer Area */}
        <div className="flex-1 flex flex-col min-h-[300px]">
          <div className="flex-1 relative">
            <textarea
              className="w-full h-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow text-gray-700 bg-gray-50/30"
              placeholder="Draft new prescription here... e.g. Rx Metformin 500mg 1-0-1 (One line per medication)"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isSubmitting}
            />
            <PenTool className="absolute right-4 top-4 text-gray-300 pointer-events-none" size={20} />
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={handleSignAndIssue}
              disabled={isSubmitting || !draft.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95"
            >
              <Send size={16} />
              <span>{isSubmitting ? 'Issuing...' : 'Sign & Issue'}</span>
            </button>
          </div>
        </div>

        {/* Historical Reference Panel */}
        <div className="lg:w-72 flex flex-col bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-3 bg-gray-100/80 border-b border-gray-200 flex items-center gap-2">
            <History size={16} className="text-gray-500" />
            <h4 className="text-sm font-bold text-gray-700">Past Prescriptions</h4>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {pastPrescriptions.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center mt-4">No past prescriptions</p>
            ) : (
              pastPrescriptions.map((pr) => (
                <div key={pr.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-xs font-bold text-blue-600 mb-2">{pr.date}</p>
                  <ul className="list-disc pl-4 text-xs text-gray-700 space-y-1 mb-2">
                    {pr.medications.map((med, idx) => (
                      <li key={idx}>{med}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">{pr.notes}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
