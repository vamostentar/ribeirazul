-- Script para migrar usuários existentes para o novo sistema de roles
-- Executar APÓS a migração do Prisma

-- Atualizar usuários existentes sem role para CLIENT (padrão)
UPDATE user_profiles 
SET role = 'CLIENT' 
WHERE role IS NULL;

-- Atualizar usuários com email específicos para ADMIN
-- (Ajustar conforme necessário)
UPDATE user_profiles 
SET role = 'ADMIN' 
WHERE email IN (
    'admin@ribeirazul.com',
    'administrador@ribeirazul.com',
    'admin@admin.com'
);

-- Verificar que todos os usuários têm role definido
SELECT 
    id, 
    firstName, 
    lastName, 
    email, 
    role, 
    isActive,
    createdAt 
FROM user_profiles 
ORDER BY createdAt DESC;

-- Verificar contagem por role
SELECT 
    role,
    COUNT(*) as count,
    COUNT(CASE WHEN isActive THEN 1 END) as active_count
FROM user_profiles 
GROUP BY role;