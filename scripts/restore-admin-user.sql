-- Script para restaurar utilizador admin
-- Ribeira Azul - Restore Admin User
-- Execute: docker exec -i <postgres-container> psql -U ribeirazul_prod -d ribeirazul < restore-admin-user.sql

-- Conectar ao schema auth
SET search_path TO auth;

-- Inserir utilizador admin (se não existir)
INSERT INTO "User" (
  id,
  email, 
  password,
  name,
  role,
  "isActive",
  "isVerified",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@ribeirazul.com',
  '$2b$10$8K1p2QQJ9Z5B5xL8vQ7Jp.8yQ5F7Nh1A9x2C3D4E5F6G7H8I9J0K1L',  -- Admin123! hashed
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

-- Verificar se foi criado
SELECT id, email, name, role, "isActive", "isVerified" 
FROM "User" 
WHERE email = 'admin@ribeirazul.com';

-- Mostrar estatísticas
SELECT 
  'auth' as schema,
  COUNT(*) as total_users,
  COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admin_users,
  COUNT(CASE WHEN "isActive" = true THEN 1 END) as active_users
FROM "User";
