# Health Portal - Secure Longitudinal Patient Record System

An enterprise-grade, secure patient data portal built with Next.js, PostgreSQL, Redis, Prisma, and Gemini AI. This portal implements a zero-trust architecture, robust concurrency control, resilient payment processing, and safety-audited AI clinical triage.

---

## 1. Core Architecture

The system is designed with secure boundary separation, transaction integrity, and robust failover handlers:

- **Next.js Gateway & Router**: Orchestrates all server and client routing.
- **PostgreSQL Database**: Enterprise-grade SQL storage using Prisma ORM with strict referential integrity.
- **Redis Cache & Session Storage**: Used for distributed locking, response caching, and token revocation lists.
- **AI Triage Engine**: Driven by Gemini API for clinical assessments.

---

## 2. Security Implementations

### Column-Level Encryption (CLE)

- **Mechanics**: Implements AES-256-GCM (Galois/Counter Mode) encryption at the database access layer.
- **Target Fields**: `ssn`, `contactInfo`, and `medicalHistory` within the `PatientRecord` model are encrypted automatically on write and decrypted on read.
- **Entropy Check**: The server validates the 256-bit entropy of the `MASTER_KEY` environment variable during initialization. If validation fails, the process terminates immediately.

### Dual-Token Session Management

- **Access Token**: Short-lived (5-minute expiry) and stored in-memory (application state) to prevent XSS collection.
- **Refresh Token**: Long-lived (7-day expiry) stored in a strict `HttpOnly`, `Secure`, `SameSite=Strict` cookie, signed with a unique `jti`.
- **Token Revocation**: Refresh tokens are blacklisted in Redis on logout, password-reset, or anomaly detection. Subsequent authentication attempts check this blacklist to deny access.

---

## 3. Concurrency & Payment Processing

### Pessimistic Concurrency Control

- **Locking Mechanism**: The booking system uses interactive transactions with `SELECT FOR UPDATE NOWAIT` querying database slots.
- **Exponential Backoff**: Concurrent slot contentions are caught and retried up to 3 times (base delay of 100ms) with exponential backoff. Failed attempts return a structured `HTTP 409 Conflict`.

### Global Idempotency Middleware

- **Idempotency Key**: Endpoints require an `X-Idempotency-Key` (UUIDv4) header.
- **Distributed Lock**: Redis locks the key during processing. Succeeding requests return cached responses (24-hour TTL) instead of hitting the database again.

### Webhook Verification

- **Signature Security**: Stripe webhook endpoints authenticate using cryptographical signatures.
- **Replay Protection**: Webhook ingestion fails if the signature timestamp is older than 5 minutes.

---

## 4. AI Safety Triage Pipeline

- **Input Sanitization**: Rejects queries with known injection key phrases.
- **XML Separation**: Clinician rules and patient queries are strictly separated inside `<clinical_guidelines>` and `<patient_input>` tags.
- **Strict Output Schema**: Gemini returns a JSON object enforced by Zod.
- **Emergency Disclaimer**: An unalterable emergency disclaimer is automatically appended if urgent conditions are met.

---

## 5. Local Setup & Testing

### Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://postgres:postgres_password@localhost:5432/health_portal?schema=public"
MASTER_KEY="64_character_hexadecimal_string"
JWT_SECRET="secure_access_token_secret_key_32_bytes"
JWT_REFRESH_SECRET="secure_refresh_token_secret_key_32_bytes"
REDIS_URL="redis://localhost:6379"
```

### Installation

```bash
npm install
```

### Run Dev Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Testing & Lints

Run unit and integration test suites:

```bash
npm test
```

Verify lint checks:

```bash
npm run lint
```
