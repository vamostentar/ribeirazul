
import { PrismaClient } from '@prisma/client';
import { config as loadEnv } from 'dotenv';
import { execSync } from 'node:child_process';
import { afterAll, beforeAll, beforeEach } from 'vitest';

// Load test environment variables
loadEnv({ path: '.env.test' });

function buildEphemeralDbName(): string {
  const base = (process.env.DATABASE_URL || '').split('/').pop() || 'properties_test';
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return `${base}_${suffix}`;
}

function replaceDatabaseInUrl(url: string, database: string): string {
  const idx = url.lastIndexOf('/');
  if (idx === -1) return url;
  return `${url.slice(0, idx + 1)}${database}`;
}

// Prefer TEST_DATABASE_URL to avoid docker host aliases like db_properties
// Fallback to a safe local default
const SOURCE_DATABASE_URL = (
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/properties_test'
) as string;

function forceLocalhost(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname !== 'localhost' && /db_properties|postgres|database/i.test(u.hostname)) {
      u.hostname = 'localhost';
    }
    return u.toString();
  } catch {
    return url;
  }
}

const LOCAL_SOURCE_URL = forceLocalhost(SOURCE_DATABASE_URL);

const EPHEMERAL_DB_NAME = buildEphemeralDbName();
const ADMIN_URL = replaceDatabaseInUrl(LOCAL_SOURCE_URL, 'postgres');
const EPHEMERAL_URL = replaceDatabaseInUrl(LOCAL_SOURCE_URL, EPHEMERAL_DB_NAME);

// Clients
const adminPrisma = new PrismaClient({ datasourceUrl: ADMIN_URL, log: ['warn', 'error'] });
export const testPrisma = new PrismaClient({ datasourceUrl: EPHEMERAL_URL, log: ['error'] });

export const createTestProperty = (overrides: Partial<any> = {}) => ({
  title: 'Test Property',
  location: 'Test Location, Lisbon',
  price: 250000,
  status: 'for_sale' as const,
  type: 'apartamento' as const,
  description: 'A beautiful test property',
  bedrooms: 2,
  bathrooms: 1,
  area: 80,
  yearBuilt: 2020,
  coordinates: {
    latitude: 38.7223,
    longitude: -9.1393,
  },
  features: ['ELEVATOR', 'BALCONY'],
  contactPhone: '+351912345678',
  contactEmail: 'test@example.com',
  ...overrides,
});

export const waitForDatabase = async (ms: number = 50) => new Promise(r => setTimeout(r, ms));

export const cleanDatabase = async () => {
  // Order matters due to FKs
  const tables = [
    'property_favorites',
    'property_visits',
    'price_history',
    'property_images',
    'properties',
    'agents',
    'users',
  ];
  for (const table of tables) {
    try {
      await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`);
    } catch {
      // ignore if not exists yet in early migration stages
    }
  }
};

beforeAll(async () => {
  // Connect admin
  await adminPrisma.$connect();

  // Create ephemeral database
  await adminPrisma.$executeRawUnsafe(`CREATE DATABASE "${EPHEMERAL_DB_NAME}"`);

  // Run prisma migrations against the ephemeral DB
  // Use CLI to ensure schema is fully applied for the new DB
  // Ensure Prisma and any code reading DATABASE_URL uses the ephemeral URL
  process.env.DATABASE_URL = EPHEMERAL_URL;
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: EPHEMERAL_URL,
      NODE_ENV: 'test',
    },
  });

  // Connect test client
  await testPrisma.$connect();
});

afterAll(async () => {
  // Clean up the ephemeral DB and drop it
  try {
    await testPrisma.$disconnect();
  } catch {}

  try {
    // Force drop in case there are remaining connections
    await adminPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${EPHEMERAL_DB_NAME}" WITH (FORCE)`);
  } catch {}

  try {
    await adminPrisma.$disconnect();
  } catch {}
});

beforeEach(async () => {
  await cleanDatabase();
});


