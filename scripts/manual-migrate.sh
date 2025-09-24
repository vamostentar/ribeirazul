#!/bin/bash
# Script para executar migrações manualmente nos containers em produção

echo "🔧 Executando migrações do Prisma manualmente..."
echo ""

# Auth Service
echo "📦 1. Auth Service - Aplicando migrações..."
docker exec -it rz_auth_prod sh -c "cd /app && npx prisma migrate deploy" || \
  docker exec rz_auth_prod sh -c "cd /app && npx prisma migrate deploy" || \
  echo "❌ Falha ao executar migrações do Auth Service"

echo ""

# Properties Service  
echo "📦 2. Properties Service - Aplicando migrações..."
docker exec -it rz_properties_prod sh -c "cd /app && npx prisma migrate deploy" || \
  docker exec rz_properties_prod sh -c "cd /app && npx prisma migrate deploy" || \
  echo "❌ Falha ao executar migrações do Properties Service"

echo ""

# Settings Service
echo "📦 3. Settings Service - Aplicando migrações..."
docker exec -it rz_settings_prod sh -c "cd /app && npx prisma migrate deploy" || \
  docker exec rz_settings_prod sh -c "cd /app && npx prisma migrate deploy" || \
  echo "❌ Falha ao executar migrações do Settings Service"

echo ""

# Users Service
echo "📦 4. Users Service - Aplicando migrações..."  
docker exec -it rz_users_prod sh -c "cd /app && npx prisma migrate deploy" || \
  docker exec rz_users_prod sh -c "cd /app && npx prisma migrate deploy" || \
  echo "❌ Falha ao executar migrações do Users Service"

echo ""

# Executar seeds no Auth Service
echo "🌱 5. Auth Service - Executando seed (criar admin)..."
docker exec -it rz_auth_prod sh -c "cd /app && npx prisma db seed" || \
  docker exec rz_auth_prod sh -c "cd /app && npx prisma db seed" || \
  echo "⚠️  Seed pode já ter sido executado ou falhou"

echo ""
echo "✅ Processo concluído!"
echo ""
echo "📝 Verificando tabelas criadas no schema auth..."
docker exec -it rz_db_prod psql -U postgres -d ribeirazul -c "\dt auth.*"

echo ""
echo "🔄 Reiniciando serviços para garantir conexões limpas..."
docker restart rz_auth_prod rz_properties_prod rz_settings_prod rz_users_prod

echo ""
echo "✨ Migrações aplicadas! Aguarde 10 segundos e teste o login novamente."
