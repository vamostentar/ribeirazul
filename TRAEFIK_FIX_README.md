# 🔧 FIX: Problema de Host Vazio no Traefik/Coolify

## 🚨 **PROBLEMA IDENTIFICADO**

O Coolify estava a gerar configurações Traefik com valores de Host vazios, causando erros como:
```
error="error while adding rule Host(``): error while checking rule Host: empty args for matcher Host, []"
```

## ✅ **SOLUÇÃO APLICADA**

### 1. **Configuração Manual do Traefik**
Criado ficheiro `traefik/dynamic/neodras.yml` com:
- Routers explícitos para web e API
- Middlewares de segurança
- Configuração SSL/TLS automática
- Headers CORS apropriados

### 2. **Labels Traefik Explícitos no Docker Compose**

**Serviços EXPOSTOS (com labels específicos):**
- `web` (Frontend): `Host(neodras.com) || Host(www.neodras.com)`
- `api-gateway`: `Host(neodras.com) && PathPrefix(/api)`

**Serviços INTERNOS (traefik.enable=false):**
- `db` (PostgreSQL)
- `redis` (Cache)
- `minio` (Storage)
- `auth` (Auth Service)
- `properties` (Properties Service)
- `media` (Media Service)
- `settings` (Settings Service)
- `users` (Users Service)

### 3. **Configurações de Prioridade**
- API Gateway: `priority=10` (alta prioridade)
- Frontend: `priority=1` (baixa prioridade)

## 🎯 **RESULTADO ESPERADO**

Após deploy, o Traefik deve:
1. ✅ Não gerar mais erros de Host vazio
2. ✅ Rotear corretamente `neodras.com` para o frontend
3. ✅ Rotear `neodras.com/api/*` para o API Gateway
4. ✅ Gerar certificados SSL automaticamente
5. ✅ Aplicar middlewares de segurança

## 🚀 **PASSOS PARA DEPLOY**

1. **Commit das alterações:**
```bash
git add .
git commit -m "fix: resolve Traefik Host empty args error with explicit labels"
git push origin main
```

2. **Deploy no Coolify:**
- Force Deploy no painel
- Monitorizar logs do coolify-proxy
- Verificar se erros de Host vazio desapareceram

3. **Testar funcionamento:**
```bash
curl -I https://neodras.com
curl -I https://neodras.com/api/v1/health
```

## 📋 **ARQUIVOS MODIFICADOS**

- ✅ `docker-compose.yaml` - Adicionados labels Traefik explícitos
- ✅ `traefik/dynamic/neodras.yml` - Configuração manual do Traefik
- ✅ `TRAEFIK_FIX_README.md` - Documentação da correção

## 🔍 **MONITORIZAÇÃO**

Verificar logs após deploy:
```bash
sudo docker logs coolify-proxy --tail 50
```

**Logs esperados (sem erros):**
- Sem mensagens de "empty args for matcher Host"
- Certificados SSL gerados com sucesso
- Routers carregados corretamente

---
**Criado por:** SuperHomem da Arquitetura 🚀  
**Data:** 21/09/2025  
**Status:** Pronto para deploy
