const fs = require('fs');
const path = require('path');

// Criar diretório dist/prisma se não existir
const distPrismaDir = path.join(__dirname, '../dist/prisma');
if (!fs.existsSync(distPrismaDir)) {
  fs.mkdirSync(distPrismaDir, { recursive: true });
}

// Ler o arquivo seed.ts
const seedTs = fs.readFileSync(path.join(__dirname, '../prisma/seed.ts'), 'utf8');

// Transpor TypeScript para JavaScript
const seedJs = seedTs
  // Substituir imports
  .replace(/import { config } from '@\/config';/, "const { config } = require('../config/index.js');")
  .replace(/import { hashPassword } from '@\/utils\/crypto';/, "const { hashPassword } = require('../utils/crypto.js');")
  .replace(/import { PrismaClient } from '@prisma\/client';/, "const { PrismaClient } = require('@prisma/client');")
  // Remover type annotations
  .replace(/: any \| null/g, '')
  .replace(/: any/g, '')
  .replace(/: string/g, '')
  .replace(/: boolean/g, '')
  .replace(/: number/g, '')
  .replace(/: Date/g, '')
  .replace(/: object/g, '')
  .replace(/: void/g, '')
  .replace(/: Promise<[^>]+>/g, '')
  // Remover interface declarations se existirem
  .replace(/interface\s+\w+\s*{[^}]*}/g, '')
  // Remover type assertions
  .replace(/as\s+\w+/g, '')
  // Remover export vazio se existir
  .replace(/export {}/g, '');

// Escrever o arquivo seed.js
fs.writeFileSync(path.join(distPrismaDir, 'seed.js'), seedJs);

console.log('✅ Seed script compiled successfully');
