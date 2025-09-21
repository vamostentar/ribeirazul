# ⚠️ MODO HTTP TEMPORÁRIO - Rate Limit Let's Encrypt

## 🚨 **SITUAÇÃO ATUAL**

O Let's Encrypt bloqueou o domínio `neodras.com` por **1 hora** devido a muitas tentativas falhadas de validação:

```
acme: error: 429 :: too many failed authorizations (5) for "neodras.com" in the last 1h0m0s
retry after 2025-09-21 09:55:06 UTC
```

## 🎯 **AÇÃO TOMADA**

**SSL/HTTPS temporariamente DESABILITADO** para permitir:
1. ✅ Testar se o roteamento HTTP básico funciona
2. ✅ Verificar se os problemas de Host vazio foram resolvidos
3. ✅ Confirmar que os routers estão configurados corretamente

## 📋 **CONFIGURAÇÃO ATUAL**

### **ATIVO (HTTP apenas):**
- `neodras-web-insecure` → `http://neodras.com` e `http://www.neodras.com`
- `neodras-api-insecure` → `http://neodras.com/api/*`

### **DESABILITADO TEMPORARIAMENTE:**
- Routers HTTPS (`neodras-web-secure`, `neodras-api-secure`)
- Middlewares de redirect HTTPS
- Certificados SSL/TLS

## ⏰ **CRONOGRAMA DE REATIVAÇÃO**

**APÓS 10:55 UTC (09:55 GMT):**
1. Reativar configurações HTTPS
2. Testar geração de certificados SSL
3. Ativar redirects HTTP → HTTPS

## 🧪 **TESTES ATUAIS**

Após deploy, testar:
```bash
# Deve funcionar (HTTP)
curl -I http://neodras.com
curl -I http://neodras.com/api/v1/health

# Deve falhar por enquanto (HTTPS)
curl -I https://neodras.com
```

## 🎯 **OBJETIVO**

Verificar se **TODOS os problemas de roteamento foram resolvidos** antes de reativar SSL:
- ✅ Sem erros de Host vazio
- ✅ Sem erros de middleware
- ✅ Roteamento HTTP funcionando perfeitamente

---
**Status:** Modo HTTP temporário ativo  
**Reativação SSL:** Após 09:55 UTC  
**Criado por:** SuperHomem da Arquitetura 🚀
