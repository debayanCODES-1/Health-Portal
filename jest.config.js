module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/lib/encryption.ts',
    'src/lib/idempotency.ts',
    'src/lib/redis.ts',
    'src/lib/prisma.ts',
    'src/app/api/appointments/book/route.ts',
    'src/app/api/auth/login/route.ts',
    'src/app/api/auth/refresh/route.ts',
    'src/app/api/auth/logout/route.ts',
    'src/app/api/auth/reset-password/route.ts',
    'src/app/api/payments/webhook/route.ts',
    'src/app/api/triage/route.ts',
  ],
};
