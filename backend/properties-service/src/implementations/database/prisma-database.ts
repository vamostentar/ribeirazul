import { PrismaClient } from '@prisma/client';
import { IDatabaseConnection, IDatabaseTransaction, IDatabaseTransactionManager } from '../../interfaces';

export class PrismaDatabaseConnection implements IDatabaseConnection {
  private client: PrismaClient;

  constructor() {
    this.client = new PrismaClient();
  }

  async connect(): Promise<void> {
    await this.client.$connect();
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  getClient(): PrismaClient {
    return this.client;
  }
}

export class PrismaTransaction implements IDatabaseTransaction {
  constructor(private tx: any) {}

  async commit(): Promise<void> {
    // Prisma transactions are automatically committed
  }

  async rollback(): Promise<void> {
    // Prisma transactions are automatically rolled back on error
  }

  getClient(): any {
    return this.tx;
  }
}

export class PrismaTransactionManager implements IDatabaseTransactionManager {
  constructor(private client: PrismaClient) {}

  async beginTransaction(): Promise<IDatabaseTransaction> {
    const tx = await this.client.$transaction(async (prisma) => {
      return prisma;
    });
    return new PrismaTransaction(tx);
  }

  async executeInTransaction<T>(operation: (tx: IDatabaseTransaction) => Promise<T>): Promise<T> {
    return await this.client.$transaction(async (prisma) => {
      const tx = new PrismaTransaction(prisma);
      return await operation(tx);
    });
  }
}
