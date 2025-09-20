#!/bin/bash

echo "🔍 ===== VALIDAÇÃO DE CONFIGURAÇÃO DE PRODUÇÃO ====="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para verificar se uma variável está definida
check_env_var() {
    local var_name=$1
    local var_value=$(grep "^${var_name}=" .env.production 2>/dev/null | cut -d'=' -f2-)
    
    if [ -z "$var_value" ] || [ "$var_value" = "your_secure_password" ] || [ "$var_value" = "your_domain.com" ]; then
        echo -e "${RED}❌ $var_name: Não configurado ou usando valor padrão${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $var_name: Configurado${NC}"
        return 0
    fi
}

# Verificar se arquivo .env.production existe
echo -e "${BLUE}1. Verificando arquivo .env.production...${NC}"
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    echo "   Copie .env.production.example para .env.production e configure as variáveis"
    exit 1
fi
echo -e "${GREEN}✅ Arquivo .env.production encontrado${NC}"
echo ""

# Verificar variáveis críticas
echo -e "${BLUE}2. Verificando variáveis de ambiente críticas...${NC}"
errors=0

# Database
check_env_var "POSTGRES_USER" || ((errors++))
check_env_var "POSTGRES_PASSWORD" || ((errors++))
check_env_var "POSTGRES_PASSWORD_URLENC" || ((errors++))

# Redis
check_env_var "REDIS_PASSWORD" || ((errors++))
check_env_var "REDIS_PASSWORD_URLENC" || ((errors++))

# JWT
check_env_var "JWT_SECRET" || ((errors++))

# Domain/API
check_env_var "API_URL" || ((errors++))
check_env_var "CORS_ORIGIN" || ((errors++))

# MinIO
check_env_var "MINIO_ROOT_USER" || ((errors++))
check_env_var "MINIO_ROOT_PASSWORD" || ((errors++))
check_env_var "S3_ACCESS_KEY_ID" || ((errors++))
check_env_var "S3_SECRET_ACCESS_KEY" || ((errors++))

echo ""

# Verificar se JWT_SECRET tem tamanho adequado
echo -e "${BLUE}3. Verificando segurança das configurações...${NC}"
jwt_secret=$(grep "^JWT_SECRET=" .env.production 2>/dev/null | cut -d'=' -f2-)
if [ ${#jwt_secret} -lt 32 ]; then
    echo -e "${RED}❌ JWT_SECRET deve ter pelo menos 32 caracteres${NC}"
    ((errors++))
else
    echo -e "${GREEN}✅ JWT_SECRET tem tamanho adequado (${#jwt_secret} chars)${NC}"
fi

# Verificar se as passwords são diferentes dos valores padrão
postgres_pass=$(grep "^POSTGRES_PASSWORD=" .env.production 2>/dev/null | cut -d'=' -f2-)
if [ "$postgres_pass" = "your_secure_postgres_password" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD ainda está usando valor padrão${NC}"
    ((errors++))
fi

echo ""

# Verificar docker-compose.production.yml
echo -e "${BLUE}4. Validando docker-compose.production.yml...${NC}"
if docker-compose --env-file .env.production -f docker-compose.production.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Configuração do docker-compose válida${NC}"
else
    echo -e "${RED}❌ Configuração do docker-compose inválida${NC}"
    echo "   Execute: docker-compose --env-file .env.production -f docker-compose.production.yml config"
    ((errors++))
fi
echo ""

# Verificar se há conflitos de porta
echo -e "${BLUE}5. Verificando conflitos de porta...${NC}"
if netstat -tuln 2>/dev/null | grep -q ":80 "; then
    echo -e "${YELLOW}⚠️  Porta 80 já está em uso${NC}"
fi
if netstat -tuln 2>/dev/null | grep -q ":443 "; then
    echo -e "${YELLOW}⚠️  Porta 443 já está em uso${NC}"
fi
echo -e "${GREEN}✅ Verificação de portas concluída${NC}"
echo ""

# Verificar se SSL está configurado
echo -e "${BLUE}6. Verificando configuração SSL...${NC}"
if [ -d "ssl" ] && [ "$(ls -A ssl)" ]; then
    echo -e "${GREEN}✅ Diretório SSL não está vazio${NC}"
else
    echo -e "${YELLOW}⚠️  Diretório SSL está vazio - configure certificados SSL${NC}"
fi
echo ""

# Resumo final
echo -e "${BLUE}7. RESUMO DA VALIDAÇÃO${NC}"
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}🎉 TODAS AS CONFIGURAÇÕES ESTÃO CORRETAS!${NC}"
    echo -e "${GREEN}✅ Sistema pronto para build de produção${NC}"
    echo ""
    echo -e "${BLUE}Próximos passos:${NC}"
    echo "1. Execute: docker-compose -f docker-compose.production.yml build --no-cache"
    echo "2. Execute: docker-compose --env-file .env.production -f docker-compose.production.yml up -d"
    echo "3. Verifique: docker-compose -f docker-compose.production.yml ps"
    exit 0
else
    echo -e "${RED}❌ ENCONTRADOS $errors PROBLEMAS DE CONFIGURAÇÃO${NC}"
    echo -e "${RED}🛑 Corrija os problemas antes de prosseguir com o build${NC}"
    exit 1
fi
