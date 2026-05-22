export type Patient = {
  id: string;
  name: string;
  age: number;
  bloodGroup: string;
  abhaId: string;
};

export type Vitals = {
  bloodSugar: number;
  heartRate: number;
  bloodPressure: string;
  bmi: number;
  spO2: number;
  lastUpdated: string;
};

export type MedicalStatus = {
  activeMedications: string[];
  knownAllergies: string[];
};

export type Diagnosis = {
  id: string;
  condition: string;
  icd10: string;
  status: 'Active' | 'Inactive' | 'Monitoring';
  diagnosedDate: string;
};

export type MedicalHistoryEvent = {
  id: string;
  date: string;
  hospitalName: string;
  event: string;
  // Note: Doctor's name is deliberately excluded for privacy
};

export type LabReport = {
  id: string;
  date: string;
  title: string;
  summary: string;
};

export type Prescription = {
  id: string;
  date: string;
  medications: string[];
  notes: string;
};

// --- Mock Data Instances ---

export const mockPatient: Patient = {
  id: 'p-1001',
  name: 'Rajesh Kumar',
  age: 45,
  bloodGroup: 'O+',
  abhaId: '91-1234-5678-9012'
};

export const mockVitals: Vitals = {
  bloodSugar: 110,
  heartRate: 72,
  bloodPressure: '120/80',
  bmi: 24.5,
  spO2: 98,
  lastUpdated: '2026-05-23T08:00:00Z'
};

export const mockMedicalStatus: MedicalStatus = {
  activeMedications: ['Metformin 500mg', 'Atorvastatin 20mg'],
  knownAllergies: ['Penicillin', 'Peanuts']
};

export const mockDiagnoses: Diagnosis[] = [
  { id: 'd1', condition: 'Type 2 Diabetes Mellitus', icd10: 'E11.9', status: 'Active', diagnosedDate: '2021-03-15' },
  { id: 'd2', condition: 'Essential Hypertension', icd10: 'I10', status: 'Monitoring', diagnosedDate: '2020-11-10' },
  { id: 'd3', condition: 'Acute Bronchitis', icd10: 'J20.9', status: 'Inactive', diagnosedDate: '2023-01-20' },
];

export const mockMedicalHistory: MedicalHistoryEvent[] = [
  { id: 'h1', date: '2025-10-12', hospitalName: 'Apollo Hospitals', event: 'Appendectomy Surgery' },
  { id: 'h2', date: '2023-01-20', hospitalName: 'City Clinic', event: 'Treated for Acute Bronchitis' },
  { id: 'h3', date: '2021-03-15', hospitalName: 'Fortis Healthcare', event: 'Diagnosed with Type 2 Diabetes' },
];

export const mockLabReports: LabReport[] = [
  {
    id: 'l1',
    date: '2026-05-20',
    title: 'Comprehensive Metabolic Panel (CMP)',
    summary: 'Blood glucose is slightly elevated at 110 mg/dL. All other metabolic markers including liver and kidney functions are within normal limits.'
  },
  {
    id: 'l2',
    date: '2026-02-15',
    title: 'Lipid Profile',
    summary: 'LDL cholesterol is 95 mg/dL (well controlled). HDL is 45 mg/dL. Triglycerides are normal.'
  }
];

export const mockPrescriptions: Prescription[] = [
  {
    id: 'pr1',
    date: '2026-04-10',
    medications: ['Metformin 500mg (1-0-1)', 'Atorvastatin 20mg (0-0-1)'],
    notes: 'Continue current dosage. Review in 3 months.'
  },
  {
    id: 'pr2',
    date: '2023-01-20',
    medications: ['Azithromycin 500mg (1-0-0) for 3 days', 'Paracetamol 500mg (SOS)'],
    notes: 'For Acute Bronchitis and fever.'
  }
];
