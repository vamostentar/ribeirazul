import { dependencyConfig } from '@/config/dependency-config';
import { afterAll, beforeAll } from 'vitest';

/**
 * Setup global para testes
 */
beforeAll(async () => {
  // Configurar ambiente de teste
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.DEBUG_ENABLED = 'false';
  
  // Reset das dependências
  dependencyConfig.reset();
});

afterAll(async () => {
  // Limpeza após todos os testes
  dependencyConfig.reset();
});





