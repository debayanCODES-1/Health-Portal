-- Supabase SQL Schema for Health-Portal

-- 1. Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abha_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  blood_group TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Vitals Table
CREATE TABLE IF NOT EXISTS vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  blood_sugar INTEGER,
  heart_rate INTEGER,
  blood_pressure TEXT,
  bmi NUMERIC(4,1),
  sp_o2 INTEGER,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Medical Status Table
CREATE TABLE IF NOT EXISTS medical_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  active_medications TEXT[],
  known_allergies TEXT[]
);

-- 4. Diagnoses Table
CREATE TABLE IF NOT EXISTS diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  icd10 TEXT NOT NULL,
  status TEXT CHECK (status IN ('Active', 'Inactive', 'Monitoring')),
  diagnosed_date DATE NOT NULL
);

-- 5. Medical History Table (Includes attending_doctor for auditing)
CREATE TABLE IF NOT EXISTS medical_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  hospital_name TEXT NOT NULL,
  event TEXT NOT NULL,
  attending_doctor TEXT NOT NULL
);

-- 6. Lab Reports Table
CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL
);

-- 7. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  medications TEXT[] NOT NULL,
  notes TEXT
);

-- Insert Dummy Data
INSERT INTO patients (id, abha_id, name, age, blood_group)
VALUES ('00000000-0000-0000-0000-000000000001', '91-1234-5678-9012', 'Rajesh Kumar', 45, 'O+');

INSERT INTO vitals (patient_id, blood_sugar, heart_rate, blood_pressure, bmi, sp_o2)
VALUES ('00000000-0000-0000-0000-000000000001', 110, 72, '120/80', 24.5, 98);

INSERT INTO medical_status (patient_id, active_medications, known_allergies)
VALUES ('00000000-0000-0000-0000-000000000001', ARRAY['Metformin 500mg', 'Atorvastatin 20mg'], ARRAY['Penicillin', 'Peanuts']);

INSERT INTO diagnoses (patient_id, condition, icd10, status, diagnosed_date)
VALUES 
('00000000-0000-0000-0000-000000000001', 'Type 2 Diabetes Mellitus', 'E11.9', 'Active', '2021-03-15'),
('00000000-0000-0000-0000-000000000001', 'Essential Hypertension', 'I10', 'Monitoring', '2020-11-10'),
('00000000-0000-0000-0000-000000000001', 'Acute Bronchitis', 'J20.9', 'Inactive', '2023-01-20');

INSERT INTO medical_history (patient_id, date, hospital_name, event, attending_doctor)
VALUES 
('00000000-0000-0000-0000-000000000001', '2025-10-12', 'Apollo Hospitals', 'Appendectomy Surgery', 'Dr. Ramesh Sharma'),
('00000000-0000-0000-0000-000000000001', '2023-01-20', 'City Clinic', 'Treated for Acute Bronchitis', 'Dr. Anjali Gupta'),
('00000000-0000-0000-0000-000000000001', '2021-03-15', 'Fortis Healthcare', 'Diagnosed with Type 2 Diabetes', 'Dr. Suresh Mehta');

INSERT INTO lab_reports (patient_id, date, title, summary)
VALUES 
('00000000-0000-0000-0000-000000000001', '2026-05-20', 'Comprehensive Metabolic Panel (CMP)', 'Blood glucose is slightly elevated at 110 mg/dL. All other metabolic markers including liver and kidney functions are within normal limits.'),
('00000000-0000-0000-0000-000000000001', '2026-02-15', 'Lipid Profile', 'LDL cholesterol is 95 mg/dL (well controlled). HDL is 45 mg/dL. Triglycerides are normal.');

INSERT INTO prescriptions (patient_id, date, medications, notes)
VALUES 
('00000000-0000-0000-0000-000000000001', '2026-04-10', ARRAY['Metformin 500mg (1-0-1)', 'Atorvastatin 20mg (0-0-1)'], 'Continue current dosage. Review in 3 months.'),
('00000000-0000-0000-0000-000000000001', '2023-01-20', ARRAY['Azithromycin 500mg (1-0-0) for 3 days', 'Paracetamol 500mg (SOS)'], 'For Acute Bronchitis and fever.');
