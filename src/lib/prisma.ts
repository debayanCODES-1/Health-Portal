/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@prisma/client'; // Force IDE type reload
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { encrypt, decrypt } from './encryption';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL;
export const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const basePrisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;

const ENCRYPTED_FIELDS = ['ssn', 'contactInfo', 'medicalHistory'];

function encryptFields(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const copy = { ...data } as Record<string, unknown>;
  for (const field of ENCRYPTED_FIELDS) {
    if (copy[field] && typeof copy[field] === 'string') {
      copy[field] = encrypt(copy[field]);
    }
  }
  return copy;
}

function decryptFields(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const copy = { ...data } as Record<string, unknown>;
  for (const field of ENCRYPTED_FIELDS) {
    if (copy[field] && typeof copy[field] === 'string') {
      try {
        copy[field] = decrypt(copy[field]);
      } catch {
        // Fallback if data is not encrypted
      }
    }
  }
  return copy;
}

export const prisma = basePrisma.$extends({
  query: {
    patientRecord: {
      async create({ args, query }: { args: any; query: any }) {
        if (args.data) {
          args.data = encryptFields(args.data);
        }
        const result = await query(args);
        return decryptFields(result);
      },
      async createMany({ args, query }: { args: any; query: any }) {
        if (args.data) {
          if (Array.isArray(args.data)) {
            args.data = args.data.map(encryptFields);
          } else {
            args.data = encryptFields(args.data);
          }
        }
        const result = await query(args);
        return result;
      },
      async update({ args, query }: { args: any; query: any }) {
        if (args.data) {
          args.data = encryptFields(args.data);
        }
        const result = await query(args);
        return decryptFields(result);
      },
      async updateMany({ args, query }: { args: any; query: any }) {
        if (args.data) {
          args.data = encryptFields(args.data);
        }
        const result = await query(args);
        return result;
      },
      async upsert({ args, query }: { args: any; query: any }) {
        if (args.create) {
          args.create = encryptFields(args.create);
        }
        if (args.update) {
          args.update = encryptFields(args.update);
        }
        const result = await query(args);
        return decryptFields(result);
      },
      async findUnique({ args, query }: { args: any; query: any }) {
        const result = await query(args);
        return decryptFields(result);
      },
      async findFirst({ args, query }: { args: any; query: any }) {
        const result = await query(args);
        return decryptFields(result);
      },
      async findMany({ args, query }: { args: any; query: any }) {
        const result = await query(args);
        if (Array.isArray(result)) {
          return result.map(decryptFields);
        }
        return result;
      },
    },
  },
});

if (typeof process !== 'undefined') {
  process.on('uncaughtException', (error) => {
    console.error('CRITICAL UNCAUGHT EXCEPTION:', error);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('CRITICAL UNHANDLED REJECTION at:', promise, 'reason:', reason);
  });
}
