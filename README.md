# Health Portal - Secure Longitudinal Patient Record System

An enterprise-grade, secure longitudinal patient data portal built with Next.js, PostgreSQL, Redis, Prisma, and Gemini AI. This system implements a zero-trust security model, strict column-level encryption, a pessimistic locking concurrency controller for bookings, a resilient idempotent payment processing middleware, and a safety-audited clinical triage pipeline.

---

## 🚀 1. System Architecture & Data Flow

The architecture is divided into logical layers separating client presentation, secure routing gatekeepers, transactional logic, caching stores, and analytical external interfaces.

```mermaid
graph TD
    Client[Client Browser / Next.js SPA] -->|HTTPS Requests| LB[Next.js API Gateway / Middleware]
    LB -->|Idempotency Validation| Redis[(Redis Cache & Session Store)]
    LB -->|Verification & Auth Decryption| DB[(PostgreSQL Database)]
    LB -->|Clinical Triage Analysis| Triage[AI Triage Pipeline / Gemini]
    Triage -->|Rule Evaluation & Disclaimer Force| Client
    Webhook[Stripe Webhooks Ingest] -->|Cryptographic Verification| DB
```

---

## 🔒 2. Zero-Trust Security Architecture

Security is baked directly into the system layers rather than verified peripherally. The database schema is defined in [schema.prisma](file:///d:/PROJECT/healthprotal/prisma/schema.prisma) and managed through transparent extensions.

### A. Automatic Column-Level Encryption (CLE)
* **Encryption Standard**: AES-256-GCM (Galois/Counter Mode) implementing unique initialization vectors (IVs) and authentication tags per cell write to prevent differential analysis.
* **Encrypted Columns**: `ssn`, `contactInfo`, and `medicalHistory` within the `PatientRecord` model.
* **Transparent Hooks**: Governed by the extended Prisma client in [prisma.ts](file:///d:/PROJECT/healthprotal/src/lib/prisma.ts) which references the core algorithms defined in [encryption.ts](file:///d:/PROJECT/healthprotal/src/lib/encryption.ts).
* **Entropy & Safety Fail-Fast**: On initialization, [encryption.ts](file:///d:/PROJECT/healthprotal/src/lib/encryption.ts) checks for the presence of the `MASTER_KEY` environment variable. It strictly validates that:
  1. The key is defined.
  2. It is a valid 64-character hexadecimal string.
  3. It decodes to exactly 32 bytes (256-bit entropy).
  If any validation check fails, the application prints a fatal error and terminates immediately.
* **Bypass-Resilient Asserts**: Automated integration tests in [security.test.ts](file:///d:/PROJECT/healthprotal/src/app/api/auth/security.test.ts) bypass the ORM layer to run raw SQL queries, asserting that data in PostgreSQL is stored as cipher text and structure (`iv:authTag:ciphertext`).

### B. Dual-Token Authentication Strategy
To minimize XSS exfiltration and CSRF session hijacking:
1. **Access Token**: Short-lived (300 seconds validity) token sent on login and refresh. Stored only in-memory (client-side state).
2. **Refresh Token**: Long-lived (7 days validity) token issued as an HTTP-only, secure, `SameSite=Strict` cookie, signed with a unique JWT ID (`jti`) and `JWT_REFRESH_SECRET`.

### C. Redis Token Revocation & Blacklisting
* **Logout & Revocation**: Managed by [logout API route](file:///d:/PROJECT/healthprotal/src/app/api/auth/logout/route.ts). When a user logs out, the `jti` is extracted from the refresh token.
* **Distributed TTL Blacklisting**: The `jti` is written to Redis via [redis.ts](file:///d:/PROJECT/healthprotal/src/lib/redis.ts) with a TTL matching the token's remaining lifespan.
* **Authentication Gate**: The [refresh API route](file:///d:/PROJECT/healthprotal/src/app/api/auth/refresh/route.ts) inspects the Redis cache for every request. If the incoming token JTI is found in the blacklist, it rejects the request instantly with a `401 Unauthorized` response and clears the client cookies.

---

## ⚡ 3. Concurrency & Appointment Slot Booking

Booking scheduling systems must handle high-volume race conditions. The portal provides robust pessimistic concurrency locks to ensure scheduling integrity.

### A. Pessimistic Write Locking (FOR UPDATE NOWAIT)
* **Booking Endpoint**: Implemented in [booking API route](file:///d:/PROJECT/healthprotal/src/app/api/appointments/book/route.ts).
* **Conflict Prevention Strategy**: When reserving a timeslot, the server launches an interactive database transaction. It issues a raw PostgreSQL query:
  ```sql
  SELECT id, status FROM appointments
  WHERE doctor_id = $1 AND timeslot = $2
  FOR UPDATE NOWAIT
  ```
  This immediately locks the row. If another transaction has acquired a lock on the same row, PostgreSQL immediately throws a conflict error (`55P03`) rather than forcing the server thread to hang and wait.

### B. Exponential Retry Backoff
To resolve transient concurrent booking failures:
* **Parameters**: Under the hood, conflict errors (serialization failures `40001`, unique constraint violations `23505`, lock timeouts `55P03`) trigger automated retries:
  * **Max Retries**: 3 (total of 4 attempts).
  * **Base Delay**: 100ms.
  * **Backoff Equation**: `delay = baseDelay * (2^attempt)`.
* **Exhaustion Handling**: If all retries fail, it gracefully returns a `409 Conflict` status with a structured error payload `{ "error": "SLOT_UNAVAILABLE", "message": "This slot was just booked." }` to preserve UI consistency.
* **Verification**: Verified using a multi-worker concurrency test in [booking.test.ts](file:///d:/PROJECT/healthprotal/src/app/api/appointments/book/booking.test.ts) spawning 50 concurrent requests for the same slot, confirming exactly 1 slot registers as booked and 49 receive a `409` conflict response.

---

## 💳 4. Payments Layer & Stripe Webhook Security

The platform integrates Stripe Checkout for appointment invoicing and leverages defensive design pattern middleware to prevent payment loss or duplication.

### A. Global Idempotency Middleware
* **Decorator Pattern**: A high-order function `withIdempotency` in [idempotency.ts](file:///d:/PROJECT/healthprotal/src/lib/idempotency.ts) wraps critical state-modifying handlers.
* **Idempotency Key**: Requests require a UUIDv4 header `X-Idempotency-Key`.
* **Locking & Caching Flow**:
  1. A distributed Redis lock is set to `LOCKED` with a 30-second expiry window upon request ingestion.
  2. If a duplicate request enters during processing, the lock returns a `409 Conflict` (race condition shield).
  3. On success, the response body, headers, and status are cached in Redis for 24 hours.
  4. Subsequent duplicate requests serve cached results instantly, returning an `X-Cache-Lookup: HIT` header without hitting the core database.

### B. Cryptographic Webhook Integrity
* **Webhook Ingestion**: Implemented in [payments webhook route](file:///d:/PROJECT/healthprotal/src/app/api/payments/webhook/route.ts).
* **Verification & Replay Prevention**: Verification checks cryptographic signatures using the Stripe SDK. It enforces a strict 5-minute maximum window for signature timestamps.
* **Transactional Reliability**: If signature validation succeeds, the update is executed within an atomic database transaction (updating appointment status to `PAID` and transaction status to `COMPLETED`). If database updates fail, it returns an HTTP `500` error to force Stripe to schedule automated webhook retries.
* **Verification Tests**: Configured and validated under [payments tests](file:///d:/PROJECT/healthprotal/src/app/api/payments/payments.test.ts).

---

## 🤖 5. AI Safety Triage Pipeline

The clinical triage pipeline classifies patient symptom queries using Google's Gemini API to assess risk levels.

### A. Pre-Processing Sanitization (Injection Shielding)
* **Keyword Filter**: Queries in [triage API route](file:///d:/PROJECT/healthprotal/src/app/api/triage/route.ts) are scanned for known system injection keywords (`ignore`, `bypass`, `override`, `disregard`, `forget`, `roleplay`, `act as`, `you are now`).
* **Direct Rejection**: Compromised inputs are immediately blocked and returned with a standard low-risk classification without ever reaching the Gemini API.

### B. Structural XML Wrapping & Guideline Isolation
* **Isolation Boundary**: Sanitized customer input is isolated from system instructions inside dedicated XML tags to prevent formatting attacks:
  ```text
  <clinical_guidelines>
  [System boundaries, safety rules, output schemas]
  </clinical_guidelines>
  <patient_input>
  [User query]
  </patient_input>
  ```

### C. Zod Output Validation & Enforced Disclaimers
* **Output Forcing**: The Gemini model is configured with a JSON response MIME type.
* **Schema Verification**: The returned JSON structure is validated using Zod:
  ```typescript
  const TriageResponseSchema = z.object({
    triage_level: z.enum(['low', 'medium', 'high']),
    summary: z.string(),
    requires_doctor: z.boolean(),
    disclaimer: z.string()
  });
  ```
* **Disclaimer Middleware**: If the triage level flags a doctor consultation or if emergency symptoms are detected, the output parser automatically overrides the payload, setting `requires_doctor: true` and appending a mandatory legal disclaimer directing the patient to emergency facilities.
* **Fuzz Testing**: Adversarial integration tests in [triage tests](file:///d:/PROJECT/healthprotal/src/app/api/triage/triage.test.ts) evaluate the pipeline against 20 distinct prompt injections and 20 critical emergency queries.

---

## 🎨 6. User Interface & Portals

The application implements a responsive user interface with curated palettes, typography, glassmorphism card layouts, and subtle animations.

### 🏥 Doctor Portal
Built to aggregate patient metrics at a single glance:
* **Patient Header** [PatientHeader.tsx](file:///d:/PROJECT/healthprotal/src/components/doctor/PatientHeader.tsx): Displays basic identity details, age, and ABHA ID.
* **Vitals Dashboard** [VitalsDashboard.tsx](file:///d:/PROJECT/healthprotal/src/components/doctor/VitalsDashboard.tsx): Modern telemetry dashboard visualizing blood pressure, sugar levels, heart rate, bmi, and spO2 metrics with live update trackers.
* **Current Medical Status** [MedicalStatus.tsx](file:///d:/PROJECT/healthprotal/src/components/doctor/MedicalStatus.tsx): Tracks active medications and known allergies.
* **Diagnosis Tracking** [DiagnosisTracker.tsx](file:///d:/PROJECT/healthprotal/src/components/doctor/DiagnosisTracker.tsx): Categorized tabs displaying conditions ('Active', 'Monitoring', 'Inactive') alongside their corresponding ICD-10 medical codes.
* **E-Prescription Writer** [EPrescription.tsx](file:///d:/PROJECT/healthprotal/src/components/doctor/EPrescription.tsx): Sandbox environment for doctors to write, sign, and issue prescriptions with quick reference tabs to historical patient scripts.
* **Lab Reports Panel** [LabReports.tsx](file:///d:/PROJECT/healthprotal/src/components/doctor/LabReports.tsx): Summarized reports with metadata.
* **Past History Timeline** [PastHistoryTimeline.tsx](file:///d:/PROJECT/healthprotal/src/components/doctor/PastHistoryTimeline.tsx): Clean SVG timeline outlining prior hospital events, procedures, and surgeries.

### 👤 Patient Portal
Empowers patients to track their records and govern their data:
* **Real-time Risk Alerting** [PatientRiskAlerts.tsx](file:///d:/PROJECT/healthprotal/src/components/patient/PatientRiskAlerts.tsx): Automatic heuristic parsing indicating cardiovascular risk notifications when concurrent diabetes and hypertension diagnoses are detected.
* **Unified Records Viewer** [PatientRecordsView.tsx](file:///d:/PROJECT/healthprotal/src/components/patient/PatientRecordsView.tsx): Unified, secure repository displaying medical history, prescriptions, and lab diagnostic summaries.
* **Consent & Access Manager** [ConsentManager.tsx](file:///d:/PROJECT/healthprotal/src/components/patient/ConsentManager.tsx): Fine-grained data access controls. Patients can grant or revoke record permissions for individual hospital entities and clinical practitioners in real-time.

---

## 📂 7. Project Directory Structure

```text
├── .github/
│   └── workflows/
│       └── production-gate.yml         # CI/CD Pipeline (Lint, DB setup, Jest coverage gate)
├── prisma/
│   └── schema.prisma                   # PostgreSQL database models
├── scripts/
│   └── setup-env.js                    # Automated key/secret environment config generator
├── src/
│   ├── app/
│   │   ├── api/                        # Next.js API Routes (Route Handlers)
│   │   │   ├── appointments/           # Concurrency-controlled slot reservations
│   │   │   ├── auth/                   # Zero-trust JWT tokens & Redis token revocation
│   │   │   ├── payments/               # Stripe webhook verifiers
│   │   │   └── triage/                 # Sanitized AI Clinical triage classifier
│   │   ├── doctor/                     # Doctor dashboard pages
│   │   ├── patient/                    # Patient portal pages
│   │   ├── login/                      # Unified login entry point
│   │   ├── globals.css                 # CSS styles
│   │   ├── layout.tsx                  # Global Next.js app layout
│   │   └── page.tsx                    # Landing page / portal selection
│   ├── components/                     # Reusable UI component blocks
│   │   ├── common/                     # Error boundaries & layout elements
│   │   ├── doctor/                     # Medical telemetry, timelines, and prescription widgets
│   │   └── patient/                    # Consent managers, records views, and risk warnings
│   └── lib/                            # Infrastructure and system utilities
│       ├── encryption.ts               # AES-256-GCM Column-Level encryption utils
│       ├── prisma.ts                   # Extended Prisma client instance
│       ├── redis.ts                    # Redis token revocation & blacklist manager
│       ├── idempotency.ts              # Global HTTP idempotency route wrapper
│       └── mockData.ts                 # Type definitions & mock clinical datasets
├── docker-compose.yml                  # Postgres, Redis, and Setup service orchestrator
├── package.json                        # Scripts and dependencies configurations
├── tsconfig.json                       # TypeScript rules configuration
└── jest.config.js                      # Jest testing setup configuration
```

---

## 🛠️ 8. Local Setup & Production Launch

### A. System Requirements
- Node.js (v20 or higher)
- Docker & Docker Compose
- Stripe CLI (Optional, for real Stripe webhook testing)

### B. Setup Development Services
Clone the repository, download dependencies, and boot the core services (PostgreSQL, Redis, and environment variables) via Docker:

```bash
# 1. Download project dependencies
npm install

# 2. Spin up database, cache, and run setup scripts
docker-compose up --build
```
*Note: The `setup` container inside `docker-compose.yml` automatically triggers [setup-env.js](file:///d:/PROJECT/healthprotal/scripts/setup-env.js) to generate secure default keys and runs `prisma db push` to synchronize Postgres.*

### C. Manual Environment Configurations
If running outside of Docker Compose, create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://postgres:postgres_password@localhost:5432/health_portal?schema=public"
REDIS_URL="redis://localhost:6379"
MASTER_KEY="<64_character_hexadecimal_string_32_bytes>"
JWT_SECRET="<secure_access_token_secret_key_32_bytes>"
JWT_REFRESH_SECRET="<secure_refresh_token_secret_key_32_bytes>"
GEMINI_API_KEY="<your_google_gemini_api_key>"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### D. Run Applications
```bash
# Start Next.js Development Server
npm run dev

# Compile Production Bundle
npm run build

# Start Production Server
npm start
```

---

## 🧪 9. Verification & Quality Gates

The project integrates a quality check system before builds can merge into the production branch.

### A. Running Tests & Linters Locally
* **Test Suite execution**: Runs unit tests, concurrency bookings simulations, cryptographic webhook validations, and adversarial triage fuzzing.
  ```bash
  npm test
  ```
* **Lint Check execution**: Runs strict typescript-eslint checks.
  ```bash
  npm run lint
  ```

### B. CI/CD Quality Gate (GitHub Actions)
The workflow defined in [production-gate.yml](file:///d:/PROJECT/healthprotal/.github/workflows/production-gate.yml) operates on every pull request and push to the `main` or `master` branch:
1. Spins up isolated Alpine containers for `PostgreSQL:15` and `Redis:7`.
2. Runs code validation audits.
3. Automatically sets up the database schema inside the test environment.
4. Executes the test suite under Jest, enforcing a strict **90% coverage threshold** across statements, lines, branches, and functions:
   ```yaml
   npx jest --coverage --coverageThreshold='{"global":{"branches":90,"functions":90,"lines":90,"statements":90}}'
   ```
   If code coverage drops below this 90% floor or any linter warnings are thrown, the build gate fails.
