# Health Portal - Secured Patient Record System

This repository contains the Health Portal application, a Next.js system designed for secure, longitudinal patient medical record management. The project uses PostgreSQL as the primary database, Redis for session and idempotency caching, Prisma as the ORM, and Google's Gemini API for symptom triage classification.

---

## 1. System Architecture and Data Flow

The system architecture separates client views, API handlers, data storage, and caching layers to enforce security boundaries and transaction isolation.

```mermaid
graph TD
    Client[Client App / Next.js] -->|HTTPS Requests| LB[Next.js API Gateway / Middleware]
    LB -->|Idempotency Check| Redis[(Redis Cache & Blacklist)]
    LB -->|Verification & Auth| DB[(PostgreSQL Database)]
    LB -->|Medical Query| Triage[AI Triage Pipeline / Gemini]
    Triage -->|Rule Evaluation| Client
    Webhook[Stripe Webhooks Ingest] -->|Verify Signature & Tx| DB
```

---

## 2. Zero-Trust Security Architecture

Security controls are implemented directly at the database and application levels. The database structure is configured in [schema.prisma](file:///d:/PROJECT/healthprotal/prisma/schema.prisma).

### Column-Level Encryption (CLE)

* **Algorithm**: AES-256-GCM (Galois/Counter Mode) with a unique initialization vector (IV) and authentication tag per cell write.
* **Target Columns**: The columns `ssn`, `contactInfo`, and `medicalHistory` within the `PatientRecord` model are automatically encrypted on database write and decrypted on database read.
* **Prisma Extensions**: CLE is handled transparently by the ORM extension in [prisma.ts](file:///d:/PROJECT/healthprotal/src/lib/prisma.ts) using the utilities defined in [encryption.ts](file:///d:/PROJECT/healthprotal/src/lib/encryption.ts).
* **Environment Validation**: During initialization, [encryption.ts](file:///d:/PROJECT/healthprotal/src/lib/encryption.ts) verifies the `MASTER_KEY` environment variable. The server terminates immediately if the key is:
  1. Missing.
  2. Not a valid 64-character hexadecimal string.
  3. Not decoding to exactly 32 bytes (256 bits).
* **Test Validation**: The test suite in [security.test.ts](file:///d:/PROJECT/healthprotal/src/app/api/auth/security.test.ts) queries the database using raw SQL to verify that stored data is in the `iv:tag:ciphertext` format, asserts token expiration boundaries, validates JTI blacklisting, and verifies logout and password-reset session invalidations.

### Dual-Token Session Management

1. **Access Token**: Short-lived (300 seconds validity) token stored in client-side memory to minimize XSS exposure.
2. **Refresh Token**: Long-lived (7 days validity) token sent as an HTTP-only, secure, `SameSite=Strict` cookie, signed with a unique JWT ID (`jti`) and verified using `JWT_REFRESH_SECRET`.

### Token Revocation and Blacklisting

* **Logout Process**: Handled by the [logout API route](file:///d:/PROJECT/healthprotal/src/app/api/auth/logout/route.ts). The server extracts the `jti` from the user's refresh token.
* **Redis Storage**: The `jti` is stored in Redis via [redis.ts](file:///d:/PROJECT/healthprotal/src/lib/redis.ts) as a revoked identifier, with a TTL set to the token's remaining validity duration.
* **Verification Gate**: The [refresh API route](file:///d:/PROJECT/healthprotal/src/app/api/auth/refresh/route.ts) inspects Redis on every token swap. If the `jti` is present in the blacklist, the server clears cookies and returns a `401 Unauthorized` response.

---

## 3. Concurrency and Appointment Slot Booking

The booking system prevents scheduling conflicts and race conditions when multiple users attempt to reserve the same slot.

### Pessimistic Row Locking

* **Implementation**: The [booking API route](file:///d:/PROJECT/healthprotal/src/app/api/appointments/book/route.ts) reserves slots within an interactive database transaction using raw SQL.
* **SQL Query**:

  ```sql
  SELECT id, status FROM appointments
  WHERE doctor_id = $1 AND timeslot = $2
  FOR UPDATE NOWAIT
  ```

  Using `NOWAIT` ensures that if another transaction has locked the row, the query fails immediately with database code `55P03` instead of waiting.

### Retry Backoff Logic

If a lock conflict (`55P03`), serialization failure (`40001`), or unique constraint violation (`23505` / `P2002`) occurs:

* **Max Retries**: 3 (total of 4 execution attempts).
* **Base Delay**: 100ms.
* **Backoff Equation**: `delay = baseDelay * (2^attempt)`.
* **Failure Response**: If all retries fail, the route returns an HTTP `409 Conflict` response with the body `{ "error": "SLOT_UNAVAILABLE", "message": "This slot was just booked." }`.
* **Test Validation**: Verified by [booking.test.ts](file:///d:/PROJECT/healthprotal/src/app/api/appointments/book/booking.test.ts), which triggers 50 concurrent booking requests to the same slot, confirming exactly one transaction succeeds while 49 fail with code `409`.

---

## 4. Payments Layer and Stripe Webhooks

Payments are integrated using Stripe Checkout. The system uses idempotency controls to prevent duplicate transactions.

### Global Idempotency Middleware

* **Route Decorator**: The higher-order function `withIdempotency` in [idempotency.ts](file:///d:/PROJECT/healthprotal/src/lib/idempotency.ts) wraps state-modifying endpoints.
* **Header Requirement**: The client must provide a UUIDv4 in the `X-Idempotency-Key` header.
* **Redis Lock Flow**:
  1. A Redis key is set to `LOCKED` with a 30-second expiry to block concurrent duplicate requests.
  2. If the request is a duplicate and already completed, the middleware serves the cached HTTP status and body from Redis (24-hour cache TTL) and appends the `X-Cache-Lookup: HIT` header.
  3. If the request is new, it executes the route, caches the output in Redis, and appends `X-Cache-Lookup: MISS`.

### Webhook Verification

* **Endpoint**: Handled in the [payments webhook route](file:///d:/PROJECT/healthprotal/src/app/api/payments/webhook/route.ts).
* **Security Checks**: Cryptographic signatures are verified using the Stripe SDK. Timestamp values are checked to prevent replay attacks (maximum drift of 5 minutes).
* **Database Updates**: On verification, an atomic transaction updates the appointment status to `PAID` and transaction status to `COMPLETED`. Database write errors return an HTTP `500` response to trigger Stripe webhooks retries.
* **Tests**: Verified by integration tests in [payments.test.ts](file:///d:/PROJECT/healthprotal/src/app/api/payments/payments.test.ts).

---

## 5. Automated Triage Pipeline

Symptom triage uses Google's Gemini API to classify patient queries.

### Pre-Processing Input Sanitization

* **Keyword Matching**: Incoming queries in the [triage API route](file:///d:/PROJECT/healthprotal/src/app/api/triage/route.ts) are scanned for injection keywords (`ignore`, `bypass`, `override`, `disregard`, `forget`, `roleplay`, `act as`, `you are now`).
* **Immediate Rejection**: Queries containing these keywords are rejected without calling the Gemini API.

### XML Tag Isolation

* **Instruction Safety**: System rules are isolated from user inputs by wrapping prompt content in XML tags:

  ```text
  <clinical_guidelines>
  [System boundaries and safety instructions]
  </clinical_guidelines>
  <patient_input>
  [Sanitized user text]
  </patient_input>
  ```

### Schema Enforcing and Disclaimer Middleware

* **JSON Format**: Gemini is set to return JSON matching a configured Zod schema.
* **Zod Schema**:

  ```typescript
  const TriageResponseSchema = z.object({
    triage_level: z.enum(['low', 'medium', 'high']),
    summary: z.string(),
    requires_doctor: z.boolean(),
    disclaimer: z.string()
  });
  ```

* **Enforced Disclaimers**: If `requires_doctor` is true or emergency keywords are matched, the middleware sets `requires_doctor: true` and appends a mandatory legal disclaimer.
* **Fuzz Testing**: Verified in [triage.test.ts](file:///d:/PROJECT/healthprotal/src/app/api/triage/triage.test.ts) using 20 injection strings and 20 critical emergency cases.

---

## 6. Directory Structure

```text
├── .github/
│   └── workflows/
│       └── production-gate.yml         # CI/CD pipeline (Lint, DB push, Jest tests)
├── prisma/
│   └── schema.prisma                   # Database schema definitions
├── scripts/
│   └── setup-env.js                    # Script to auto-generate default keys
├── src/
│   ├── app/
│   │   ├── api/                        # Next.js API route handlers
│   │   │   ├── appointments/           # Appointment slot bookings
│   │   │   ├── auth/                   # Authentication, login, and refreshes
│   │   │   ├── payments/               # Stripe webhook verifications
│   │   │   └── triage/                 # Automated clinical symptom triage
│   │   ├── doctor/                     # Doctor page views
│   │   ├── patient/                    # Patient page views
│   │   ├── login/                      # Login interface
│   │   ├── globals.css                 # CSS styles
│   │   ├── layout.tsx                  # Global Next.js app layout
│   │   └── page.tsx                    # Portal entry selection page
│   ├── components/                     # Frontend UI widgets
│   │   ├── common/                     # Layout wrappers & error boundaries
│   │   ├── doctor/                     # Medical telemetry, timelines, and prescriptions
│   │   └── patient/                    # Consent systems and patient records views
│   └── lib/                            # Application helpers
│       ├── encryption.ts               # AES-256-GCM utilities
│       ├── prisma.ts                   # Extended ORM configuration
│       ├── redis.ts                    # Blacklist caching layer
│       ├── idempotency.ts              # Route idempotency middleware
│       └── mockData.ts                 # Diagnostic datasets
├── docker-compose.yml                  # Docker services (Postgres, Redis, setup script)
├── package.json                        # Dependencies and script definitions
├── tsconfig.json                       # TypeScript compiler options
└── jest.config.js                      # Test suite parameters
```

---

## 7. Installation and Local Setup

### System Prerequisites

* Node.js (v20 or higher)
* Docker and Docker Compose

### Booting Development Services

Run the following commands in the root directory:

```bash
# Install NPM dependencies
npm install

# Run database, caching services, and initialize environment variables
docker-compose up --build
```

*Note: The setup container automatically runs [setup-env.js](file:///d:/PROJECT/healthprotal/scripts/setup-env.js) to configure the local `.env` file and executes `prisma db push` on PostgreSQL.*

### Manual Environment File (.env)

If services are executed locally without Docker, define a `.env` file:

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

---

## 8. Verification and Quality Gates

### Running Tests Locally

Ensure Postgres and Redis containers are healthy, then execute:

```bash
# Run ESLint linter
npm run lint

# Run Jest tests
npm test
```

### GitHub Actions Pipeline

The pipeline defined in [production-gate.yml](file:///d:/PROJECT/healthprotal/.github/workflows/production-gate.yml) runs on every push and pull request. It enforces:

1. Strict ESLint checking with `--max-warnings=0`.
2. Database schema validation and migrations.
3. Test suite coverage limits under Jest:

   ```yaml
   npx jest --coverage --coverageThreshold='{"global":{"branches":90,"functions":90,"lines":90,"statements":90}}'
   ```

   If code coverage drops below the 90% threshold for branches, functions, lines, or statements, the build gate fails.
