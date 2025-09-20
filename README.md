# 🏠 RibeiraZul - Mediação Imobiliária

> **MVP Completo** - Sistema moderno de gestão imobiliária com React, Node.js e PostgreSQL

## ✨ Funcionalidades Principais

### 🎯 **Frontend Moderno**
- ✅ **Design responsivo** com Tailwind CSS
- ✅ **Interface intuitiva** para navegação
- ✅ **Seção Hero** com call-to-actions
- ✅ **Catálogo de imóveis** com filtros
- ✅ **Formulário de leads** funcional
- ✅ **Área de contato** integrada
- ✅ **Logo profissional** em SVG

### 🔧 **Backend Robusto**
- ✅ **API REST** com Express.js
- ✅ **Database PostgreSQL** com Prisma ORM
- ✅ **Sistema de autenticação** JWT
- ✅ **Upload de imagens** otimizado
- ✅ **CORS configurado** para segurança

### 📱 **Painel Administrativo**
- ✅ **Gestão de imóveis** (CRUD completo)
- ✅ **Gestão de projetos** de construção
- ✅ **Dashboard de leads** recebidos
- ✅ **Configurações gerais** da empresa

## 🚀 **Como Executar**

### Development (Local)
```bash
# Clone e acesse o projeto
cd ribeirazul

# Inicie todos os serviços
docker-compose up -d

# Acesse:
# Frontend: http://localhost:3001
# Admin: http://localhost:3001/admin
# API: http://localhost:8081
```

### Production (Deploy)
```bash
# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações de produção

# Execute em modo produção
docker-compose -f docker-compose.prod.yml up -d
```

## 🌐 **Opções de Deploy**

### 1. **VPS/Servidor Próprio** (Recomendado)
- Upload dos arquivos para servidor
- `docker-compose -f docker-compose.prod.yml up -d`
- Configure nginx/apache para proxy reverso

### 2. **DigitalOcean/AWS/Azure**
- Deploy via Docker em droplet/instância
- Configure domínio e SSL (Let's Encrypt)

### 3. **Vercel/Netlify** (Frontend only)
- Frontend: Deploy automático via Git
- Backend: Railway, Render ou Heroku

## 📊 **Arquitetura**

```
Frontend (React + Vite)  ←→  API (Node.js + Express)  ←→  Database (PostgreSQL)
       ↓                           ↓                            ↓
  http://localhost:3001    http://localhost:8081         http://localhost:5432
```

## 🎨 **Features Implementadas**

### ✅ **Seções do Site**
1. **Hero Section** - Impacto visual + estatísticas
2. **Imóveis** - Catálogo filtrado + cards modernos
3. **Projetos** - Obras em destaque
4. **Contato** - Informações + formulário de leads
5. **Footer** - Redes sociais + informações legais

### ✅ **Painel Admin**
1. **Dashboard** - Visão geral dos dados
2. **Imóveis** - Gestão completa (adicionar/editar/remover)
3. **Projetos** - Gestão de obras
4. **Leads** - Visualização de contatos recebidos
5. **Configurações** - Dados da empresa

## 🔐 **Credenciais Padrão**
- **Admin**: admin@ribeirazul.pt
- **Senha**: admin123

## 📱 **Tecnologias Utilizadas**

### Frontend
- **React 18** + TypeScript
- **Vite** (build tool ultrarrápido)
- **Tailwind CSS** (design system)
- **React Query** (state management)
- **React Router** (navegação)

### Backend
- **Node.js** + Express
- **TypeScript** (type safety)
- **Prisma** (ORM moderno)
- **JWT** (autenticação)
- **Multer** (upload files)

### Database
- **PostgreSQL 16** (production-ready)
- **Schema otimizado** para performance

### DevOps
- **Docker** + Docker Compose
- **Multi-stage builds** para otimização
- **Health checks** para reliability

## 📈 **Status do Projeto**

🎯 **MVP COMPLETO** - Pronto para demonstração ao cliente!

- ✅ Frontend moderno e responsivo
- ✅ Backend funcional com todas APIs
- ✅ Database estruturada e populada
- ✅ Painel admin operacional
- ✅ Logo profissional integrado
- ✅ Sistema de leads funcionando
- ✅ Deploy-ready com Docker

---

🏆 **Desenvolvido com excelência técnica** - Ready for Production!