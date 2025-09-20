#!/bin/bash

echo "🔐 ===== CONFIGURAÇÃO SSL PARA PRODUÇÃO ====="
echo ""

# Verificar se certbot está instalado
if ! command -v certbot &> /dev/null; then
    echo "❌ Certbot não está instalado!"
    echo "Instale com: sudo apt-get install certbot python3-certbot-nginx"
    exit 1
fi

# Verificar se o domínio foi configurado
DOMAIN=${1:-"www.neodras.com"}
API_DOMAIN=${2:-"api.neodras.com"}

echo "🌐 Configurando SSL para:"
echo "   - Frontend: $DOMAIN"
echo "   - API: $API_DOMAIN"
echo ""

# Parar nginx se estiver rodando
echo "🛑 Parando serviços web temporariamente..."
docker-compose -f docker-compose.production.yml stop web nginx-proxy 2>/dev/null || true

# Obter certificados
echo "📜 Obtendo certificados SSL..."
sudo certbot certonly --standalone \
    --agree-tos \
    --no-eff-email \
    --email admin@neodras.com \
    -d $DOMAIN \
    -d $API_DOMAIN

if [ $? -eq 0 ]; then
    echo "✅ Certificados SSL obtidos com sucesso!"
    
    # Copiar certificados para o diretório ssl
    sudo mkdir -p ./ssl/live/$DOMAIN
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./ssl/live/$DOMAIN/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./ssl/live/$DOMAIN/
    sudo chown -R $(whoami):$(whoami) ./ssl/
    
    echo "✅ Certificados copiados para ./ssl/"
else
    echo "❌ Falha ao obter certificados SSL"
    echo "Verifique se o domínio aponta para este servidor"
    exit 1
fi

# Atualizar configuração nginx para HTTPS
echo "🔧 Atualizando configuração nginx para HTTPS..."

# Criar configuração nginx com SSL
cat > frontend/nginx-site-ssl.conf << EOF
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name $DOMAIN $API_DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

# Frontend HTTPS
server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    root /usr/share/nginx/html;
    index index.html;

    # Health endpoint
    location = /health {
        add_header Content-Type text/plain;
        return 200 'ok';
    }

    # API proxy
    location /api/ {
        proxy_pass http://api-gateway:8081;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Static assets with long cache
    location ~* \.(?:js|mjs|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

# API HTTPS
server {
    listen 443 ssl http2;
    server_name $API_DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    location / {
        proxy_pass http://api-gateway:8081;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
EOF

echo "✅ Configuração nginx SSL criada"

# Configurar auto-renovação
echo "🔄 Configurando auto-renovação SSL..."
(crontab -l 2>/dev/null; echo "0 0,12 * * * /usr/bin/certbot renew --quiet && docker-compose -f docker-compose.production.yml restart web") | crontab -

echo ""
echo "🎉 SSL configurado com sucesso!"
echo ""
echo "Próximos passos:"
echo "1. Atualizar docker-compose.production.yml para usar nginx-site-ssl.conf"
echo "2. Reiniciar o serviço web: docker-compose -f docker-compose.production.yml restart web"
echo "3. Testar: https://$DOMAIN"
