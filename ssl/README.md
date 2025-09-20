# Configuração SSL

## Para Produção Real:

1. **Obter certificados Let's Encrypt:**
```bash
sudo certbot certonly --standalone -d www.neodras.com -d api.neodras.com
sudo cp /etc/letsencrypt/live/www.neodras.com/* ./ssl/live/www.neodras.com/
```

2. **Configurar auto-renovação:**
```bash
echo "0 0,12 * * * /usr/bin/certbot renew --quiet && docker-compose -f docker-compose.production.yml restart web" | crontab -
```

3. **Usar configuração SSL:**
```bash
# Atualizar docker-compose para usar nginx-site-ssl.conf
# Definir SSL_ENABLED=true no .env.production
```

## Para Teste Local:

O sistema está configurado para funcionar sem SSL (HTTP apenas) para testes locais.

## Status Atual:
- ❌ Certificados SSL não configurados
- ✅ Sistema funciona sem SSL para testes
- ✅ Configuração preparada para SSL quando necessário
