# Arquitetura Black Box - User Service

Este documento explica como o User Service implementa os princípios de arquitetura modular e black box baseados na metodologia de Eskil Steenberg.

## Filosofia de Desenvolvimento

**"É mais rápido escrever cinco linhas de código hoje do que escrever uma linha hoje e depois ter que editá-la no futuro."**

## Princípios Fundamentais

### 1. Código que Nunca Precisa Ser Editado

Cada linha de código deve ser escrita corretamente desde o início. Não há "refatoração futura" - o código deve ser projetado para durar.

**Exemplo:**
```typescript
// ❌ Implementação que precisará ser editada
class UserService {
  async getUser(id: string) {
    // Implementação específica do Prisma
    return this.prisma.user.findUnique({ where: { id } });
  }
}

// ✅ Implementação que nunca precisará ser editada
interface UserRepository {
  findById(id: string): Promise<User | null>;
}

class UserService {
  constructor(private userRepo: UserRepository) {}
  
  async getUser(id: string) {
    return this.userRepo.findById(id);
  }
}
```

### 2. Fronteiras Modulares Claras

Cada módulo tem uma responsabilidade única e comunica apenas através de interfaces bem definidas.

**Estrutura Modular:**
```
UserService
├── Interfaces (contratos)
├── Implementations (detalhes)
├── Services (lógica de negócio)
├── Controllers (HTTP)
└── Routes (endpoints)
```

### 3. Interfaces Testáveis

Cada módulo pode ser testado isoladamente através das suas interfaces públicas.

**Exemplo de Teste Black Box:**
```typescript
describe('UserService', () => {
  it('should create user profile', async () => {
    // Arrange
    const mockRepo = new MockUserRepository();
    const service = new UserService(mockRepo);
    
    // Act
    const result = await service.createProfile(validData);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.data.email).toBe(validData.email);
  });
});
```

### 4. Facilidade de Debugging

Problemas são fáceis de localizar porque cada módulo tem responsabilidades claras.

**Estratégias de Debug:**
- Logging em fronteiras de módulos
- Contexto de requisição em todas as operações
- Métricas de performance por módulo
- Health checks granulares

### 5. Prontidão para Substituição

Qualquer módulo pode ser reescrito sem afetar outros.

**Exemplo de Substituição:**
```typescript
// Implementação atual
class PrismaUserRepository implements UserRepository {
  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }
}

// Nova implementação (ex: MongoDB)
class MongoUserRepository implements UserRepository {
  async findById(id: string) {
    return this.mongo.users.findOne({ _id: id });
  }
}

// O UserService não precisa ser alterado!
```

## Padrões de Implementação

### 1. Wrapper Pattern para Dependências Externas

Nunca use bibliotecas externas diretamente. Sempre crie uma interface wrapper.

```typescript
// ❌ Uso direto
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ✅ Interface wrapper
interface DatabaseConnection {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  users: UserRepository;
}

class PrismaDatabase implements DatabaseConnection {
  private prisma = new PrismaClient();
  // Implementação...
}
```

### 2. Dependency Injection

Configure dependências através de injeção, não através de imports diretos.

```typescript
// ❌ Dependência hardcoded
class UserService {
  private db = new PrismaDatabase();
}

// ✅ Injeção de dependência
class UserService {
  constructor(private db: DatabaseConnection) {}
}
```

### 3. Configuration Isolation

Comportamento do módulo controlado através de parâmetros, não globais.

```typescript
// ❌ Configuração global
process.env.DATABASE_URL = '...';

// ✅ Configuração isolada
interface DatabaseConfig {
  url: string;
  logLevel: string[];
}

class PrismaDatabase {
  constructor(private config: DatabaseConfig) {}
}
```

## Estrutura de Testes

### Testes de Interface (Black Box)

Teste o que o módulo faz, não como faz.

```typescript
describe('UserProfileService', () => {
  describe('createProfile', () => {
    it('should create profile with valid data', async () => {
      // Testa a interface, não a implementação
    });
    
    it('should reject invalid email', async () => {
      // Testa comportamento esperado
    });
    
    it('should handle database errors gracefully', async () => {
      // Testa tratamento de erros
    });
  });
});
```

### Testes de Integração

Teste como os módulos trabalham juntos.

```typescript
describe('User Registration Flow', () => {
  it('should handle complete registration process', async () => {
    const validator = new EmailValidator();
    const hasher = new PasswordHasher();
    const database = new UserDatabase();
    const registrar = new UserRegistrar(validator, hasher, database);

    const result = await registrar.register('user@example.com', 'password');
    expect(result.success).toBe(true);
  });
});
```

### Testes de Substituição

Garanta que módulos podem ser trocados.

```typescript
describe('Database Interface Compatibility', () => {
  const implementations = [
    new PrismaUserDatabase(),
    new MongoUserDatabase(),
    new MockUserDatabase(),
  ];

  implementations.forEach((db) => {
    it(`should work with ${db.constructor.name}`, async () => {
      const service = new UserService(db);
      const user = await service.createUser('test@example.com');
      expect(user.id).toBeDefined();
    });
  });
});
```

## Red Flags a Evitar

### 1. Acoplamento Forte
```typescript
// ❌ Módulos que conhecem demais sobre outros
class UserService {
  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    const preferences = await this.prisma.preferences.findMany({
      where: { userId: user.id } // Conhece estrutura interna
    });
  }
}
```

### 2. Abstrações Vazadas
```typescript
// ❌ Interface que expõe detalhes de implementação
interface UserRepository {
  findUserByPrismaQuery(query: PrismaQuery): Promise<User>;
}
```

### 3. Funções Monolíticas
```typescript
// ❌ Função fazendo múltiplas coisas não relacionadas
async function processUser(userId: string) {
  const user = await getUser(userId);
  const preferences = await getPreferences(userId);
  const interests = await getInterests(userId);
  const notifications = await getNotifications(userId);
  // ... 50 linhas mais
}
```

### 4. Estado Global
```typescript
// ❌ Estado compartilhado entre módulos
let currentUser: User | null = null;

class UserService {
  setCurrentUser(user: User) {
    currentUser = user; // Estado global
  }
}
```

## Benefícios da Arquitetura Black Box

1. **Velocidade de Desenvolvimento**: Código que nunca precisa ser editado
2. **Facilidade de Teste**: Interfaces claras e testáveis
3. **Manutenibilidade**: Problemas fáceis de localizar e corrigir
4. **Escalabilidade**: Módulos podem ser substituídos conforme necessário
5. **Debugging**: Logs e métricas em fronteiras claras
6. **Flexibilidade**: Implementações podem ser trocadas sem afetar outros módulos

## Conclusão

A arquitetura black box não é apenas sobre esconder implementação - é sobre criar sistemas que permanecem fáceis de entender, testar e modificar conforme crescem. Cada linha de código deve contribuir para um sistema que mantém a velocidade de desenvolvimento à medida que escala.
