# 🔐 Ribeira Azul Auth Service

Enterprise-grade Authentication and Authorization microservice for the Ribeira Azul Real Estate Platform, providing secure user management, JWT-based authentication, role-based access control, and comprehensive security features.

## ✨ Features

### 🏗️ **Architecture**
- **Clean Architecture** with separation of concerns
- **Repository Pattern** for data access abstraction  
- **Service Layer** for business logic
- **Controller Layer** for HTTP handling
- **Dependency Injection** ready structure

### 🔒 **Security Features**
- **JWT Authentication** with access and refresh tokens
- **Role-Based Access Control (RBAC)** with fine-grained permissions
- **Two-Factor Authentication (2FA)** with TOTP and backup codes
- **Account Lockout** protection against brute force attacks
- **Session Management** with concurrent session limits
- **Password Security** with Argon2id hashing
- **Rate Limiting** per IP and user
- **Token Blacklisting** for secure logout
- **Audit Logging** for security events

### 🚀 **Performance & Scalability**
- **Fastify** web framework (fastest Node.js framework)
- **Redis** for session storage and caching
- **Connection pooling** with Prisma
- **Request/Response logging** with structured data
- **Health checks** for Kubernetes readiness/liveness
- **Graceful shutdown** handling

### 👤 **User Management**
- **Complete user lifecycle** (create, read, update, delete)
- **Email verification** workflow
- **Password reset** functionality
- **Profile management** with avatars
- **User statistics** and analytics
- **Advanced search** and filtering

### 🎭 **Role Management**
- **Dynamic role creation** and management
- **Permission-based authorization**
- **Role hierarchy** support
- **Bulk permission updates**

### 📊 **Observability**
- **Structured logging** with Pino
- **Request tracing** with correlation IDs
- **Performance monitoring** (memory, response times)
- **Security event tracking**
- **API documentation** with Swagger/OpenAPI

## 🛠️ **Tech Stack**

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | ≥18.17.0 |
| **TypeScript** | Type Safety | ^5.5.4 |
| **Fastify** | Web Framework | ^4.28.1 |
| **Prisma** | Database ORM | ^6.14.0 |
| **PostgreSQL** | Database | ≥13 |
| **Redis** | Session Store & Cache | ≥7 |
| **Argon2** | Password Hashing | ^0.40.3 |
| **jsonwebtoken** | JWT Handling | ^9.0.2 |
| **Speakeasy** | 2FA/TOTP | ^2.0.0 |
| **Zod** | Schema Validation | ^3.23.8 |
| **Pino** | Logging | ^9.4.0 |

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 7+
- Yarn 4+ (via corepack)

### Installation

```bash
# Enable Yarn 4
corepack enable

# Navigate to auth service
cd backend/auth-service

# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Database Setup

```bash
# Generate Prisma client
yarn prisma:generate

# Run database migrations
yarn prisma:migrate:dev

# Seed database with default data
yarn prisma:seed
```

### Development

```bash
# Start in development mode (with hot reload)
yarn dev

# Or build and start
yarn build
yarn start
```

## 📋 **API Endpoints**

### Authentication
```
POST   /api/v1/auth/login           # User login
POST   /api/v1/auth/logout          # User logout
POST   /api/v1/auth/refresh         # Refresh JWT tokens
POST   /api/v1/auth/register        # User registration (admin only)
POST   /api/v1/auth/forgot-password # Request password reset
POST   /api/v1/auth/reset-password  # Reset password with token
POST   /api/v1/auth/change-password # Change current password
```

### Two-Factor Authentication
```
POST   /api/v1/auth/2fa/enable      # Enable 2FA
POST   /api/v1/auth/2fa/verify      # Verify 2FA setup
POST   /api/v1/auth/2fa/disable     # Disable 2FA
POST   /api/v1/auth/2fa/complete    # Complete 2FA login
```

### User Management
```
GET    /api/v1/users               # List users (paginated)
POST   /api/v1/users               # Create user
GET    /api/v1/users/:id           # Get user by ID
PUT    /api/v1/users/:id           # Update user
DELETE /api/v1/users/:id           # Delete user
GET    /api/v1/users/me            # Get current user profile
PUT    /api/v1/users/me            # Update current user profile
```

### Role Management
```
GET    /api/v1/roles               # List roles
POST   /api/v1/roles               # Create role
GET    /api/v1/roles/:id           # Get role by ID
PUT    /api/v1/roles/:id           # Update role
DELETE /api/v1/roles/:id           # Delete role
```

### Session Management
```
GET    /api/v1/sessions            # List user sessions
DELETE /api/v1/sessions/:id        # Terminate session
DELETE /api/v1/sessions/all        # Terminate all sessions
```

### Health & Monitoring
```
GET    /health                     # Health check
GET    /                           # API information
GET    /docs                       # API documentation (Swagger)
```

## 🏗️ **Project Structure**

```
src/
├── config/           # Configuration management
│   └── index.ts      # Main config with Zod validation
├── types/            # TypeScript types & schemas
│   ├── common.ts     # Common types & errors
│   └── auth.ts       # Authentication types
├── utils/            # Utility functions
│   ├── crypto.ts     # Cryptographic utilities
│   ├── logger.ts     # Logging utilities
│   └── request-context.ts # Request context helpers
├── middlewares/      # HTTP middlewares
│   ├── auth.middleware.ts     # Authentication middleware
│   ├── error-handler.ts       # Global error handling
│   └── request-context.middleware.ts # Request context
├── repositories/     # Data access layer
│   ├── user.repository.ts     # User data access
│   └── session.repository.ts  # Session data access
├── services/         # Business logic layer
│   └── auth.service.ts        # Authentication service
├── controllers/      # HTTP request handlers
│   └── auth.controller.ts     # Auth endpoints
├── routes/           # Route definitions
│   ├── auth.routes.ts         # Authentication routes
│   ├── user.routes.ts         # User management routes
│   └── index.ts               # Route registration
├── app.ts           # Application setup
└── server.ts        # Server entry point
```

## 🔧 **Configuration**

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=8084
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:pass@localhost:5434/auth"
DB_MAX_CONNECTIONS=10

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
REDIS_DB=0

# JWT Configuration
JWT_SECRET="your-super-secure-jwt-secret-key-at-least-32-characters"
JWT_ACCESS_EXPIRY="1h"
JWT_REFRESH_EXPIRY="7d"
JWT_ISSUER="ribeirazul-auth-service"
JWT_AUDIENCE="ribeirazul-api"

# Password Security
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW="1 minute"
LOGIN_RATE_LIMIT_MAX=5
LOGIN_RATE_LIMIT_WINDOW="15 minutes"

# Account Security
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=900
LOCKOUT_WINDOW=300
SESSION_TIMEOUT=86400
MAX_CONCURRENT_SESSIONS=5

# Two-Factor Authentication
TOTP_ISSUER="Ribeira Azul"
TOTP_WINDOW=2

# CORS
CORS_ORIGIN="http://localhost:3001,http://localhost:3000"

# Logging
LOG_LEVEL=info
LOG_AUDIT_ENABLED=true

# API Documentation
SWAGGER_ENABLED=true
API_TITLE="Ribeira Azul Auth Service"
API_VERSION="1.0.0"

# Default Admin (Development Only)
SEED_DEFAULT_ADMIN=true
DEFAULT_ADMIN_EMAIL="admin@ribeirazul.com"
DEFAULT_ADMIN_PASSWORD="Admin123!"
```

## 🔐 **Security Best Practices**

### Password Policy
- Minimum 8 characters
- Must contain uppercase, lowercase, and numbers
- Optional special characters requirement
- Password history tracking (prevents reuse)
- Secure Argon2id hashing

### Account Protection
- Progressive delays for failed login attempts
- Account lockout after configurable failed attempts
- IP-based rate limiting
- Session timeout and concurrent session limits

### Token Security
- Short-lived access tokens (1 hour default)
- Secure refresh token rotation
- Token blacklisting for secure logout
- JWT with strong secret keys

### Audit & Monitoring
- Comprehensive audit logging
- Security event tracking
- Failed login attempt monitoring
- Suspicious activity detection

## 🚀 **Docker Deployment**

### Using Docker Compose (Recommended)

```bash
# Start all services including auth service
docker-compose up -d

# Auth service will be available at:
# http://localhost:8084
```

### Standalone Docker

```bash
# Build image
docker build -t ribeirazul-auth-service .

# Run container
docker run -d \
  --name auth-service \
  -p 8084:8084 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/auth" \
  -e REDIS_URL="redis://host:6379" \
  -e JWT_SECRET="your-jwt-secret" \
  ribeirazul-auth-service
```

## 🧪 **Testing**

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

## 📈 **Performance Considerations**

- **Database Indexing**: Proper indexes on email, username, session tokens
- **Connection Pooling**: Configured Prisma connection pooling
- **Redis Caching**: Session and frequently accessed data caching
- **Rate Limiting**: Prevents abuse and ensures fair usage
- **Efficient Queries**: Optimized database queries with proper relations

## 🔍 **Monitoring & Observability**

### Health Checks
- Database connectivity
- Redis connectivity  
- Memory usage
- Active sessions count

### Logging
- Structured JSON logging with Pino
- Request correlation IDs
- Security event logging
- Performance monitoring

### Metrics
- Authentication success/failure rates
- Session statistics
- User activity metrics
- Security event counts

## 🤝 **Integration**

### API Gateway Integration
The auth service integrates seamlessly with the API Gateway for:
- Centralized authentication
- Token validation
- Permission checking
- Session management

### Frontend Integration
Provides secure authentication for:
- Admin panel login
- User session management
- Role-based UI components
- Security notifications

## 📚 **API Documentation**

When `SWAGGER_ENABLED=true`, comprehensive API documentation is available at:
- **Development**: http://localhost:8084/docs
- **Production**: https://your-domain.com/auth/docs

## 🛡️ **Security Considerations**

### Production Deployment
- Use strong JWT secrets (64+ characters)
- Enable HTTPS/TLS encryption
- Configure proper CORS origins
- Set up proper firewall rules
- Regular security updates
- Monitor for suspicious activities

### Data Protection
- Sensitive data encryption at rest
- Secure password hashing with Argon2id
- PII data handling compliance
- Secure session management
- Audit trail maintenance

## 📞 **Support**

For issues, questions, or contributions:
- **Issues**: [GitHub Issues](https://github.com/ribeirazul/auth-service/issues)
- **Documentation**: Available in `/docs` endpoint
- **Team**: Ribeira Azul Development Team

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ by the Ribeira Azul Team**
