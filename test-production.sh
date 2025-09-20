#!/bin/bash

echo "=== Diagnóstico de Produção Ribeira Azul ==="
echo ""

# Verificar se Docker está funcionando
echo "1. Verificando Docker..."
docker --version
if [ $? -ne 0 ]; then
    echo "❌ Docker não está funcionando!"
    exit 1
fi
echo "✅ Docker OK"
echo ""

# Verificar se docker-compose está funcionando
echo "2. Verificando docker-compose..."
docker-compose --version
if [ $? -ne 0 ]; then
    echo "❌ docker-compose não está funcionando!"
    exit 1
fi
echo "✅ docker-compose OK"
echo ""

# Verificar arquivo .env.production
echo "3. Verificando arquivo .env.production..."
if [ ! -f ".env.production" ]; then
    echo "❌ Arquivo .env.production não encontrado!"
    exit 1
fi
echo "✅ Arquivo .env.production encontrado"
echo ""

# Verificar configuração do docker-compose
echo "4. Validando docker-compose.production.yml..."
docker-compose --env-file .env.production -f docker-compose.production.yml config > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Configuração do docker-compose inválida!"
    exit 1
fi
echo "✅ Configuração do docker-compose OK"
echo ""

# Limpar containers existentes
echo "5. Limpando containers existentes..."
docker-compose --env-file .env.production -f docker-compose.production.yml down --volumes --remove-orphans
echo "✅ Containers limpos"
echo ""

# Iniciar serviços de infraestrutura
echo "6. Iniciando serviços de infraestrutura (db, redis, minio)..."
docker-compose --env-file .env.production -f docker-compose.production.yml up -d db redis minio

# Aguardar inicialização
echo "7. Aguardando inicialização dos serviços..."
sleep 10

# Verificar status dos serviços
echo "8. Verificando status dos serviços..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "=== Diagnóstico concluído ==="