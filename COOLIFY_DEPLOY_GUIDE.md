# 🚀 Guia de Deploy via Coolify - Ribeira Azul

## 📋 Pré-requisitos Confirmados
- ✅ VPS Oracle configurado
- ✅ DNS configurado apontando para o IP do servidor
- ✅ Portas abertas (80, 443)
- ✅ Coolify instalado e funcionando

## 🎯 PASSO A PASSO PARA DEPLOY

### **PASSO 1: Preparar Repositório**

1. **Commit e push todas as alterações:**
```bash
git add .
git commit -m "feat: production-ready configuration with dynamic URLs and SSL support"
git push origin main
```

2. **Verificar se o repositório está acessível** no GitHub/GitLab

### **PASSO 2: Criar Projeto no Coolify**

1. **Aceder ao Coolify** no teu VPS
2. **Criar novo projeto:**
   - Nome: `ribeira-azul`
   - Descrição: `Real Estate Platform - Production`

3. **Adicionar novo serviço:**
   - Tipo: `Docker Compose`
   - Nome: `ribeira-azul-platform`

### **PASSO 3: Configurar Repositório**

1. **Source Configuration:**
   - Repository URL: `https://github.com/SEU_USUARIO/ribeirazul.git`
   - Branch: `main`
   - Deploy Key: (gerar se repositório privado)

2. **Build Configuration:**
   - Docker Compose File: `docker-compose.coolify.yml`
   - Build Pack: `Docker Compose`

### **PASSO 4: Configurar Variáveis de Ambiente**

**No Coolify, adicionar estas variáveis (Environment Variables):**

```env
# Database
POSTGRES_USER=ribeirazul_prod
POSTGRES_PASSWORD=SUA_PASSWORD_SEGURA_AQUI
POSTGRES_DB=ribeirazul

# Redis
REDIS_PASSWORD=SUA_REDIS_PASSWORD_AQUI

# JWT
JWT_SECRET=SEU_JWT_SECRET_MUITO_SEGURO_MINIMO_64_CARACTERES

# Domain/CORS
API_URL=https://www.neodras.com
CORS_ORIGIN=https://www.neodras.com,https://neodras.com

# MinIO
MINIO_ROOT_USER=ribeirazul_minio
MINIO_ROOT_PASSWORD=SUA_MINIO_PASSWORD_AQUI
S3_ACCESS_KEY_ID=ribeirazul_minio
S3_SECRET_ACCESS_KEY=SUA_MINIO_SECRET_AQUI
S3_BUCKET_NAME=ribeirazul-media

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1m
```

### **PASSO 5: Configurar Domínios**

1. **No Coolify, configurar domínios:**
   - Primary Domain: `www.neodras.com`
   - Additional: `neodras.com`
   - API Subdomain: `api.neodras.com` (opcional)

2. **SSL Configuration:**
   - Enable: `Let's Encrypt SSL`
   - Force HTTPS: `Yes`
   - HSTS: `Yes`

### **PASSO 6: Configurar Health Checks**

**No Coolify, definir:**
- Health Check URL: `/health`
- Health Check Port: `80`
- Health Check Interval: `30s`

### **PASSO 7: Deploy**

1. **Fazer primeiro deploy:**
   - Clicar em `Deploy`
   - Monitorizar logs de build
   - Aguardar conclusão (5-10 minutos)

2. **Verificar se todos os serviços sobem:**
   - Database primeiro
   - Depois Redis e MinIO
   - Depois serviços backend
   - Por fim API Gateway e Frontend

### **PASSO 8: Executar Migrations**

**Após deploy bem-sucedido, executar migrations:**

Via Coolify Terminal ou SSH:
```bash
# Auth Service
docker exec CONTAINER_NAME npx prisma migrate deploy

# Properties Service  
docker exec CONTAINER_NAME npx prisma migrate deploy

# Users Service
docker exec CONTAINER_NAME npx prisma migrate deploy

# Settings Service
docker exec CONTAINER_NAME npx prisma migrate deploy
```

### **PASSO 9: Verificar Funcionamento**

1. **Testar URLs:**
   - `https://www.neodras.com` - Frontend
   - `https://www.neodras.com/api/v1/properties` - API
   - `https://www.neodras.com/health` - Health check

2. **Verificar logs** no Coolify dashboard

3. **Testar funcionalidades:**
   - Login/Register
   - Upload de imagens
   - CRUD de propriedades

## 🔧 TROUBLESHOOTING

### Problemas Comuns:

1. **Build falha:**
   - Verificar se todas as variáveis estão definidas
   - Verificar logs de build no Coolify

2. **Serviços não conectam:**
   - Verificar se health checks passam
   - Verificar logs dos containers

3. **Database connection fails:**
   - Verificar se migrations foram executadas
   - Verificar credenciais da database

4. **SSL não funciona:**
   - Verificar se DNS aponta corretamente
   - Verificar se Let's Encrypt consegue validar domínio

## 📞 Próximos Passos

1. Commit e push do código
2. Configurar projeto no Coolify
3. Definir variáveis de ambiente
4. Fazer deploy
5. Executar migrations
6. Testar funcionamento

**Estás pronto para começar?** 🚀
