# RibeiraZul - Sistema Imobiliário

## Arquitetura do Sistema

### Estrutura de Microserviços
- **Frontend (React + TypeScript + Vite)**: Porta 3001
- **API Gateway (Fastify + TypeScript)**: Porta 8081 - Proxy para todos os serviços
- **Auth Service (Fastify + Prisma)**: Porta 8084 - Autenticação e autorização
- **Properties Service (Fastify + Prisma)**: Porta 8082 - Gestão de propriedades + imagens
- **Media Service (Fastify + S3/MinIO)**: Porta 8083 - Gestão de mídia
- **PostgreSQL Databases**: 
  - Main DB (porta 5432)
  - Properties DB (porta 5433) 
  - Auth DB (porta 5434)
- **Redis**: Porta 6379 - Cache e sessões
- **MinIO S3**: Porta 9000 - Storage de imagens

### Fluxo de Upload de Imagens
1. **Frontend** → **API Gateway** (localhost:8081/api/v1/properties/:id/images)
2. **API Gateway** → **Properties Service** (properties:8082/api/v1/properties/:id/images)
3. **Properties Service** processa e salva no storage local + banco de dados

### Problemas Identificados e Corrigidos
1. **PRINCIPAL**: VITE_API_URL estava configurada para `http://api-gateway:8081` (hostname interno Docker) 
   - **CORREÇÃO**: Alterada para `http://localhost:8081` para funcionar no browser

### Endpoints de Upload de Imagens
- **POST** `/api/v1/properties/:propertyId/images` - Upload de imagem para propriedade
- **GET** `/api/v1/properties/:propertyId/images` - Listar imagens da propriedade  
- **PUT** `/api/v1/images/:id` - Atualizar metadados da imagem
- **DELETE** `/api/v1/images/:id` - Deletar imagem
- **PUT** `/api/v1/properties/:propertyId/images/reorder` - Reordenar imagens

### Tecnologias Principais
- **Frontend**: React 18, TypeScript, Tailwind CSS, React Query, Axios
- **Backend**: Fastify, TypeScript, Prisma, PostgreSQL
- **Infraestrutura**: Docker, Docker Compose, Yarn Workspaces
- **Storage**: Sistema local de arquivos + MinIO S3 (configurável)

### Comandos Principais
- `yarn dev` - Inicia todos os serviços via Docker Compose
- `yarn down` - Para todos os serviços e remove volumes
- `yarn logs` - Mostra logs do API Gateway
- `yarn db` - Acessa PostgreSQL via CLI

### Estrutura de Diretórios
```
├── frontend/                 # React frontend
├── backend/
│   ├── api-gateway/         # Gateway principal
│   ├── auth-service/        # Serviço de autenticação  
│   ├── properties-service/  # Serviço de propriedades + imagens
│   └── media-service/       # Serviço de mídia
├── docker-compose.yml       # Configuração dos containers
└── package.json            # Scripts principais
```

### Status do Projeto
✅ MVP Completo - Sistema funcional de gestão imobiliária
✅ Upload de imagens implementado
✅ Problema de rede corrigido (VITE_API_URL)
✅ Arquitetura de microserviços estabelecida
✅ Dockerização completa