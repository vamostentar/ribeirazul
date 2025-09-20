import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { afterAll, beforeAll, beforeEach } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// When running suites with ephemeral DB, skip global connections/cleanup to avoid conflicts
const IS_EPHEMERAL = process.env.EPHEMERAL_TEST === '1';

// Global test database client
export const testPrisma = new PrismaClient({
  datasourceUrl: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/properties_test',
  log: ['error'],
});

// Test data factories
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

export const createTestPropertyFilters = (overrides: Partial<any> = {}) => ({
  limit: 20,
  sortBy: 'createdAt' as const,
  sortOrder: 'desc' as const,
  ...overrides,
});

// Database cleanup utilities
export const cleanDatabase = async () => {
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
      await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (error) {
      // Table might not exist yet, ignore
    }
  }
};

// Global test setup
if (!IS_EPHEMERAL) {
  beforeAll(async () => {
    await testPrisma.$connect();
    try {
      await testPrisma.$executeRawUnsafe('SELECT 1');
    } catch (error) {
      console.error('Test database connection failed:', error);
      process.exit(1);
    }
  });
}

if (!IS_EPHEMERAL) {
  afterAll(async () => {
    await cleanDatabase();
    await testPrisma.$disconnect();
  });
}

if (!IS_EPHEMERAL) {
  beforeEach(async () => {
    await cleanDatabase();
  });
}

// Test utilities
export const waitForDatabase = async (ms: number = 100) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createMultipleProperties = async (count: number, overrides: Partial<any> = {}) => {
  const properties = [];
  for (let i = 0; i < count; i++) {
    const property = await testPrisma.property.create({
      data: {
        ...createTestProperty({
          title: `Test Property ${i + 1}`,
          price: 200000 + (i * 50000),
          ...overrides,
        }),
      },
    });
    properties.push(property);
  }
  return properties;
};
