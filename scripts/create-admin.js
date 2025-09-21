// Script para criar utilizador admin
// Execute: node scripts/create-admin.js

const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

async function main() {
  console.log('🔐 Gerando hash para senha Admin123!...');
  
  const password = 'Admin123!';
  const hashedPassword = await hashPassword(password);
  
  console.log('📋 DADOS PARA INSERIR NA BASE DE DADOS:');
  console.log('=====================================');
  console.log('Email:', 'admin@ribeirazul.com');
  console.log('Password (original):', password);
  console.log('Password (hash):', hashedPassword);
  console.log('Role:', 'ADMIN');
  console.log('=====================================');
  
  console.log('\n📝 SQL PARA EXECUTAR:');
  console.log(`
INSERT INTO auth."User" (
  id, email, password, name, role, "isActive", "isVerified", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@ribeirazul.com',
  '${hashedPassword}',
  'Administrator',
  'ADMIN',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "isActive" = EXCLUDED."isActive",
  "isVerified" = EXCLUDED."isVerified",
  "updatedAt" = NOW();
  `);
}

main().catch(console.error);
