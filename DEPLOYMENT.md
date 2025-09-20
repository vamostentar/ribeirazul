# 🚀 Guia de Deployment - Ribeira Azul

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Preparação do Ambiente](#preparação-do-ambiente)
3. [Configuração de Segurança](#configuração-de-segurança)
4. [Build e Deploy](#build-e-deploy)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Monitoring e Logging](#monitoring-e-logging)
7. [Backup e Recuperação](#backup-e-recuperação)
8. [Troubleshooting](#troubleshooting)
9. [Checklist de Produção](#checklist-de-produção)

---

## 🔧 Pré-requisitos

### Hardware Mínimo Recomendado
- **CPU**: 4 vCPUs
- **RAM**: 8GB
- **Storage**: 50GB SSD
- **Network**: 100 Mbps

### Software Necessário
- Docker 24.0+
- Docker Compose 2.20+
- Git
- Nginx (para reverse proxy)
- Certbot (para SSL)

### Portas Necessárias
```
80    - HTTP
443   - HTTPS
8081  - API Gateway (interno)
5432  - PostgreSQL (interno)
6379  - Redis (interno)
9000  - MinIO (interno)
```

---

## 🛠️ Preparação do Ambiente

### 1. Clone o Repositório
```bash
git clone https://github.com/your-org/ribeirazul.git
cd ribeirazul
```

### 2. Estrutura de Diretórios
```bash
mkdir -p ssl monitoring/alerts backup logs
chmod 700 ssl backup
```

### 3. Configurar Firewall
```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🔐 Configuração de Segurança

### 1. Gerar Secrets Seguros
```bash
# Gerar JWT Secret (256 bits)
openssl rand -base64 64

# Gerar Password PostgreSQL
openssl rand -base64 32

# Gerar Password Redis
openssl rand -base64 32

# Gerar Password MinIO
openssl rand -base64 24

# Gerar Password Admin
openssl rand -base64 16
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar template
cp .env.production .env

# Editar com os secrets gerados
nano .env
```

**IMPORTANTE**: Nunca commitar o ficheiro `.env` para o Git!

### 3. Configurar Permissões
```bash
# Restringir acesso ao .env
chmod 600 .env .env.production

# Criar usuário para Docker (opcional)
sudo useradd -m -s /bin/bash ribeirazul
sudo usermod -aG docker ribeirazul
```

---

## 🏗️ Build e Deploy

### 1. Build das Imagens
```bash
# Build todas as imagens
docker-compose -f docker-compose.production.yml build --no-cache

# Ou build individual
docker-compose -f docker-compose.production.yml build frontend
docker-compose -f docker-compose.production.yml build api-gateway
```

### 2. Inicializar Base de Dados
```bash
# Criar schemas e estrutura
docker-compose -f docker-compose.production.yml up -d db
docker-compose -f docker-compose.production.yml exec db psql -U postgres -d ribeirazul -f /docker-entrypoint-initdb.d/init.sql
```

### 3. Deploy Completo
```bash
# Deploy com logs
docker-compose -f docker-compose.production.yml up -d

# Verificar status
docker-compose -f docker-compose.production.yml ps

# Ver logs
docker-compose -f docker-compose.production.yml logs -f --tail=100
```

### 4. Verificação de Health
```bash
# API Gateway
curl http://localhost:8081/health

# Frontend
curl http://localhost/health

# Monitoring
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3000/api/health  # Grafana
```

---

## 🔒 SSL/TLS Setup

### 1. Instalar Certbot
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx
```

### 2. Obter Certificado SSL
```bash
# Domínio principal
sudo certbot certonly --standalone -d ribeirazul.pt -d www.ribeirazul.pt

# API subdomain
sudo certbot certonly --standalone -d api.ribeirazul.pt
```

### 3. Configurar Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/ribeirazul
server {
    listen 80;
    server_name ribeirazul.pt www.ribeirazul.pt;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ribeirazul.pt www.ribeirazul.pt;

    ssl_certificate /etc/letsencrypt/live/ribeirazul.pt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ribeirazul.pt/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# API Subdomain
server {
    listen 443 ssl http2;
    server_name api.ribeirazul.pt;

    ssl_certificate /etc/letsencrypt/live/api.ribeirazul.pt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.ribeirazul.pt/privkey.pem;
    
    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 4. Auto-renovação SSL
```bash
# Adicionar ao crontab
sudo crontab -e

# Adicionar linha
0 0,12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx
```

---

## 📊 Monitoring e Logging

### 1. Deploy Stack de Monitoring
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Acessar Dashboards
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Alertmanager**: http://localhost:9093

### 3. Configurar Alertas
```yaml
# monitoring/alerts/alerts.yml
groups:
  - name: ribeirazul
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage detected"
          
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
```

### 4. Configurar Notificações
```yaml
# monitoring/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'admin@ribeirazul.pt'
        from: 'alerts@ribeirazul.pt'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@ribeirazul.pt'
        auth_password: 'your-email-password'
```

---

## 💾 Backup e Recuperação

### 1. Script de Backup Automatizado
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/ribeirazul"
mkdir -p $BACKUP_DIR

# Backup Database
docker-compose -f docker-compose.production.yml exec -T db \
  pg_dump -U postgres ribeirazul | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup Uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz ./uploads

# Backup Configuration
tar -czf $BACKUP_DIR/config_$DATE.tar.gz .env docker-compose.*.yml

# Upload to S3 (opcional)
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://ribeirazul-backups/
aws s3 cp $BACKUP_DIR/uploads_$DATE.tar.gz s3://ribeirazul-backups/

# Limpar backups antigos (manter últimos 30 dias)
find $BACKUP_DIR -type f -mtime +30 -delete
```

### 2. Agendar Backups
```bash
# Adicionar ao crontab
0 2 * * * /home/ribeirazul/backup.sh >> /var/log/backup.log 2>&1
```

### 3. Procedimento de Recuperação
```bash
# Parar serviços
docker-compose -f docker-compose.production.yml down

# Restaurar database
gunzip < backup/db_20240101_020000.sql.gz | \
  docker-compose -f docker-compose.production.yml exec -T db \
  psql -U postgres ribeirazul

# Restaurar uploads
tar -xzf backup/uploads_20240101_020000.tar.gz -C ./

# Reiniciar serviços
docker-compose -f docker-compose.production.yml up -d
```

---

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Serviço não inicia
```bash
# Ver logs detalhados
docker-compose -f docker-compose.production.yml logs service-name

# Verificar recursos
docker stats
df -h
free -m
```

#### 2. Erro de conexão à base de dados
```bash
# Verificar conectividade
docker-compose -f docker-compose.production.yml exec api-gateway \
  pg_isready -h db -p 5432

# Reset das migrations
docker-compose -f docker-compose.production.yml exec properties \
  npx prisma migrate reset --force
```

#### 3. Performance issues
```bash
# Analisar logs lentos PostgreSQL
docker-compose -f docker-compose.production.yml exec db \
  psql -U postgres -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Verificar cache Redis
docker-compose -f docker-compose.production.yml exec redis \
  redis-cli INFO stats
```

#### 4. Limpeza de recursos
```bash
# Limpar containers parados
docker container prune -f

# Limpar imagens não utilizadas
docker image prune -a -f

# Limpar volumes não utilizados
docker volume prune -f

# Limpar tudo (CUIDADO!)
docker system prune -a --volumes -f
```

---

## ✅ Checklist de Produção

### Antes do Deploy
- [ ] Secrets seguros gerados e configurados
- [ ] Ficheiro `.env.production` configurado
- [ ] Backups configurados e testados
- [ ] SSL/TLS configurado
- [ ] Firewall configurado
- [ ] Monitoring ativo

### Durante o Deploy
- [ ] Build sem erros
- [ ] Migrations executadas com sucesso
- [ ] Health checks a passar
- [ ] Logs sem erros críticos

### Após o Deploy
- [ ] Site acessível via HTTPS
- [ ] API a responder corretamente
- [ ] Login de admin funcional
- [ ] Upload de imagens funcional
- [ ] Emails a ser enviados
- [ ] Monitoring a recolher métricas
- [ ] Backups agendados
- [ ] Alertas configurados

### Performance
- [ ] Time to First Byte < 200ms
- [ ] Lighthouse Score > 90
- [ ] API response time < 100ms (p95)
- [ ] Database queries < 50ms (p95)

### Segurança
- [ ] Headers de segurança configurados
- [ ] Rate limiting ativo
- [ ] WAF configurado (opcional)
- [ ] Logs de auditoria ativos
- [ ] Princípio do menor privilégio aplicado

---

## 📞 Suporte

Para questões ou problemas:
- **Email**: suporte@ribeirazul.pt
- **Documentação**: https://docs.ribeirazul.pt
- **Status Page**: https://status.ribeirazul.pt

---

## 🔄 Atualizações

### Processo de Atualização
1. Backup completo
2. Pull das alterações
3. Build das novas imagens
4. Deploy com zero-downtime:
   ```bash
   docker-compose -f docker-compose.production.yml up -d --no-deps --build service-name
   ```
5. Verificar health checks
6. Rollback se necessário

### Rollback
```bash
# Voltar à versão anterior
docker-compose -f docker-compose.production.yml down
git checkout previous-tag
docker-compose -f docker-compose.production.yml up -d
```

---

**Última atualização**: 2025-09-09
**Versão**: 1.0.0
