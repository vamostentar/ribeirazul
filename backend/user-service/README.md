# Ribeira Azul User Service

Microserviço de gestão de utilizadores para a plataforma Ribeira Azul Real Estate.

## Arquitetura

Este serviço segue os princípios de **arquitetura modular** e **black box**, baseados na metodologia de Eskil Steenberg para criar sistemas que permanecem rápidos de desenvolver independentemente da escala.

### Princípios Fundamentais

- **"É mais rápido escrever cinco linhas de código hoje do que escrever uma linha hoje e depois ter que editá-la no futuro"**
- **Código que nunca precisa ser editado** - acertar à primeira
- **Fronteiras modulares** - separação clara entre componentes
- **Interfaces testáveis** - cada módulo pode ser testado isoladamente
- **Facilidade de debugging** - problemas são fáceis de localizar e corrigir
- **Prontidão para substituição** - qualquer módulo pode ser reescrito sem quebrar outros

## Funcionalidades

### Gestão de Perfis de Utilizadores
- Criação e atualização de perfis de clientes
- Verificação de email e telefone
- Gestão de preferências de contacto
- Configurações de privacidade

### Preferências de Utilizador
- Preferências de propriedades (tipo, preço, localização)
- Configurações de pesquisa
- Preferências de notificação
- Configurações de visualização

### Interesses em Propriedades
- Rastreamento de interesse em propriedades específicas
- Diferentes tipos de interesse (visualização, consulta, agendamento)
- Priorização de interesses
- Histórico de contacto

### Propriedades Guardadas
- Sistema de favoritos
- Organização em pastas
- Tags personalizadas
- Notas privadas

### Histórico de Pesquisas
- Rastreamento de pesquisas realizadas
- Análise de padrões de pesquisa
- Sugestões baseadas no histórico

### Sistema de Notificações
- Notificações personalizadas
- Diferentes métodos de entrega
- Gestão de estado (lida/não lida)
- Arquivamento

## Tecnologias

- **Node.js** com **TypeScript**
- **Fastify** como framework web
- **Prisma** como ORM
- **PostgreSQL** como base de dados
- **Redis** para cache (opcional)
- **Docker** para containerização
- **Yarn** com **Corepack** como gestor de pacotes

## Estrutura do Projeto

```
src/
├── config/           # Configuração centralizada
├── contracts/        # Contratos de API
├── controllers/      # Controladores HTTP
├── implementations/  # Implementações concretas
├── interfaces/       # Interfaces abstratas
├── middlewares/      # Middlewares HTTP
├── observability/    # Logging e métricas
├── repositories/     # Camada de dados
├── routes/          # Definição de rotas
├── services/        # Lógica de negócio
├── strategies/      # Estratégias de implementação
├── types/           # Definições de tipos
└── utils/           # Utilitários
```

## Configuração

### Variáveis de Ambiente

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5436/users

# Redis (opcional)
REDIS_URL=redis://localhost:6379

# Server
NODE_ENV=development
PORT=8086
HOST=0.0.0.0

# CORS
CORS_ORIGIN=http://localhost:3001

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute

# Logging
LOG_LEVEL=info

# Swagger
SWAGGER_ENABLED=true
```

## Desenvolvimento

### Pré-requisitos

- Node.js >= 18.17.0
- Yarn >= 4.0.0
- PostgreSQL >= 16
- Docker (opcional)

### Instalação

```bash
# Instalar dependências
corepack yarn install

# Gerar cliente Prisma
corepack yarn prisma:generate

# Executar migrações
corepack yarn prisma:migrate:dev

# Executar seed
corepack yarn prisma:seed

# Iniciar em modo desenvolvimento
corepack yarn dev
```

### Docker

```bash
# Construir imagem
corepack yarn docker:build

# Executar container
corepack yarn docker:run
```

## API

### Endpoints Principais

- `GET /health` - Health check
- `GET /docs` - Documentação Swagger
- `GET /api/v1/user-profiles` - Gestão de perfis
- `GET /api/v1/user-preferences` - Preferências
- `GET /api/v1/property-interests` - Interesses em propriedades
- `GET /api/v1/saved-properties` - Propriedades guardadas
- `GET /api/v1/search-history` - Histórico de pesquisas
- `GET /api/v1/notifications` - Notificações

## Testes

```bash
# Executar testes
corepack yarn test

# Executar testes em modo watch
corepack yarn test:watch

# Executar testes com cobertura
corepack yarn test:coverage
```

## Contribuição

Este projeto segue os princípios de arquitetura modular. Ao contribuir:

1. **Mantenha as interfaces limpas** - não exponha detalhes de implementação
2. **Teste as interfaces** - não a implementação interna
3. **Documente as APIs** - torne o uso óbvio para outros desenvolvedores
4. **Evite acoplamento** - módulos devem comunicar apenas através de interfaces definidas
5. **Escreva código que nunca precisa ser editado** - acerte à primeira

## Licença

MIT
