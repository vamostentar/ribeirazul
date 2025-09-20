export interface IDatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isHealthy(): Promise<boolean>;
  getClient(): any; // Generic client for repositories
}

export interface IDatabaseTransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  getClient(): any;
}

export interface IDatabaseTransactionManager {
  beginTransaction(): Promise<IDatabaseTransaction>;
  executeInTransaction<T>(operation: (tx: IDatabaseTransaction) => Promise<T>): Promise<T>;
}
