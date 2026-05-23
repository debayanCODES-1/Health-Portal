# Health Portal - Technical Presentation

---

## Slide 1: Health Portal Overview

* **System Purpose**: Secure, longitudinal patient medical record management.
* **Core Technology Stack**: Next.js App Router, Prisma ORM, PostgreSQL database, Redis session cache, Stripe billing, Google Gemini API.
* **Key Architectures**: Zero-trust column encryption, pessimistic concurrency scheduling, idempotent payment webhooks, and instruction-isolated clinical triage.

---

## Slide 2: System Architecture and Data Flow

* **Gateway**: Next.js App Router handles middleware authentication and request routing.
* **Storage Layer**: PostgreSQL primary relational datastore with strict foreign-key integrity.
* **Cache Layer**: Redis cluster handles distributed locks, response payload caching, and session token blacklist storage.
* **Services**: Google Gemini API performs symptom triage; Stripe API handles checkout session completions.

---

## Slide 3: Zero-Trust Security - Column Encryption

* **Column-Level Encryption (CLE)**: Encrypts `ssn`, `contactInfo`, and `medicalHistory` in the `PatientRecord` model.
* **Algorithm**: AES-256-GCM with a unique initialization vector (IV) and authentication tag per cell write.
* **Prisma Extension**: Automatically decrypts on read queries and encrypts on write operations.
* **Fail-Fast Boot Validator**: The application terminates immediately if the `MASTER_KEY` environment variable is missing, is not a valid 64-character hexadecimal string, or fails to decode to a 32-byte key.

---

## Slide 4: Zero-Trust Security - Auth and Session Revocation

* **Dual-Token Auth**:
  * **Access Token**: Short-lived (300 seconds) JWT token stored in-memory on the client to block XSS retrieval.
  * **Refresh Token**: Long-lived (7 days) JWT token sent via an HTTP-only, secure, `SameSite=Strict` cookie containing a unique JWT ID (`jti`).
* **Session Revocation**:
  * On logout or password reset, the token's `jti` is extracted.
  * The `jti` is written to the Redis blacklist with a TTL equal to the token's remaining lifetime.
  * The refresh endpoint validates the incoming token's `jti` against Redis, rejecting blacklisted sessions.

---

## Slide 5: High-Concurrency Slot Booking

* **Pessimistic Lock Strategy**: Interactive transactions reserve slots using raw SQL:

  ```sql
  SELECT id, status FROM appointments
  WHERE doctor_id = $1 AND timeslot = $2
  FOR UPDATE NOWAIT
  ```

* **Immediate Fail**: Using `NOWAIT` prevents thread hanging by instantly failing transaction attempts if a row-lock is held.
* **Backoff Retry**: Lock timeouts (`55P03`), serialization failures (`40001`), and unique violations (`23505`) trigger exponential retries (up to 3 retries, base delay 100ms, doubling on each attempt).

---

## Slide 6: Payments and Idempotency Layer

* **Idempotency Wrapper**: Enforces the `X-Idempotency-Key` (UUIDv4) header on POST/PUT/PATCH endpoints.
* **Lock Processing**: Sets a Redis lock with a 30-second expiry to block simultaneous duplicate requests.
* **Output Caching**: Caches completed responses in Redis for 24 hours. Subsequent duplicate requests serve cached results directly, appending the `X-Cache-Lookup: HIT` header.
* **Stripe Webhook**: Cryptographically verifies signatures, enforces a 5-minute timestamp drift threshold, and executes updates within an atomic database transaction.

---

## Slide 7: AI Safety Triage Pipeline

* **Input Sanitization**: Scans patient queries for prompt injection keywords, immediately rejecting compromised payloads.
* **XML Schema Isolation**: Separates hardcoded system instructions and user inputs using tag blocks:

  ```text
  <clinical_guidelines>
  [System boundaries and safety instructions]
  </clinical_guidelines>
  <patient_input>
  [Sanitized user text]
  </patient_input>
  ```

* **Output Constraints**: Gemini is restricted to JSON responses, which are validated using a strict Zod schema.
* **Enforced Legal Notices**: Automatically appends emergency disclaimers and overrides parameters to require a doctor consultation if warning signs are detected.

---

## Slide 8: Quality Assurance and Verification Gates

* **Linter Policies**: Enforces strict TypeScript-ESLint validation with zero allowed warnings.
* **Coverage Gates**: The CI/CD pipeline runs unit, integration, and fuzz tests under Jest, enforcing a 90% coverage threshold across lines, functions, statements, and branches.
* **Automated Migrations**: Setup scripts synchronize schema definitions and seed data automatically.
