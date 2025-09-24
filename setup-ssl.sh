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

# Note: this script only obtains certificates. TLS termination is expected to be
# handled by Coolify (or another external reverse proxy). We no longer stop or
# configure a local nginx instance.
echo "ℹ️ Obtendo certificados SSL (Coolify deve gerenciar TLS/Proxy)"

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

echo "✅ Certificados colocados em ./ssl/ — configure seu provider (Coolify) para usá-los ou deixe Coolify gerenciar automaticamente."

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
