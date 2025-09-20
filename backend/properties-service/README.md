# Properties Service 🏠

A modern, scalable microservice for real estate property management built with **Node.js**, **TypeScript**, **Fastify**, and **Prisma**.

## ✨ Features

🏗️**Architecture**
-**Clean Architecture** with separation of concerns
-**Repository Pattern** for data access abstraction  
-**Service Layer** for business logic
-**Controller Layer** for HTTP handling
-**Dependency Injection** ready structure

🚀 **Performance & Scalability**
-**Fastify** web framework (fastest Node.js framework)
-**Connection pooling** with Prisma
-**Rate limiting** with configurable rules
-**Request/Response logging** with structured data
-**Health checks** for Kubernetes readiness/liveness
-**Graceful shutdown** handling

🔒 **Security**
-**CORS** configuration with origin validation
-**Input validation** with Zod schemas
-**SQL injection** protection via Prisma
-**Security headers** (HSTS, CSP, etc.)
-**Rate limiting** per IP/user
-**Request sanitization**

🏠 **Real Estate Specific**
-**Advanced property filtering** (price, location, features, etc.)
-**Geospatial search** (find nearby properties)
-**Full-text search** across title, description, location
-**Property statistics** and analytics
-**Cursor-based pagination** for large datasets
-**Price range validation** and business rules

📊 **Observability**
-**Structured logging** with Pino
-**Request tracing** with correlation IDs
-**Performance monitoring** (memory, response times)
-**Health monitoring** endpoints
-**API documentation** with Swagger/OpenAPI

## 🛠️ **Tech Stack**

| Technology | Purpose | Version |
|------------|---------|---------|
| **Node.js** | Runtime Environment | ≥18.17.0 |
| **TypeScript** | Type Safety | ^5.5.4 |
| **Fastify** | Web Framework | ^4.28.1 |
| **Prisma** | Database ORM | ^5.22.0 |
| **PostgreSQL** | Database | ≥13 |
| **Zod** | Schema Validation | ^3.23.8 |
| **Pino** | Logging | ^9.4.0 |

## 🚀 **Quick Start**

### Prerequisites
```bash
# Required
Node.js ≥18.17.0
PostgreSQL ≥13
Yarn ≥4.0.0

# Optional
Docker & Docker Compose
Redis (for advanced rate limiting)
```

### Installation

1. **Clone and install dependencies**
```bash
cd backend/properties-service
yarn install
```

2. **Environment setup**
```bash
cp .env.example .env
# Edit .env with your database configuration
```

3. **Database setup**
```bash
# Generate Prisma client
yarn prisma:generate

# Run migrations
yarn prisma:migrate:dev

# Optional: Seed sample data
yarn db:seed
```

4. **Start development server**
```bash
yarn dev
```

The API will be available at `http://localhost:8082`

## 📖 **API Documentation**

### Development
- **Swagger UI**: http://localhost:8082/api/v1/documentation
- **API Info**: http://localhost:8082/
- **Health Check**: http://localhost:8082/health

### Endpoints Overview

#### 🏠 **Properties**
```http
POST   /api/v1/properties           # Create property
GET    /api/v1/properties           # List properties (with filters)
GET    /api/v1/properties/:id       # Get property by ID
PUT    /api/v1/properties/:id       # Update property
DELETE /api/v1/properties/:id       # Delete property
```

#### 🔍 **Search & Filters**
```http
GET    /api/v1/properties/search?q=villa              # Text search
GET    /api/v1/properties/nearby?lat=40.7&lng=-74.0   # Location-based search
GET    /api/v1/properties?minPrice=100000&maxPrice=500000  # Price range
GET    /api/v1/properties?bedrooms=3&bathrooms=2      # Property characteristics
```

#### 📊 **Analytics**
```http
GET    /api/v1/properties-stats     # Properties statistics
```

#### ❤️ **Health & Monitoring**
```http
GET    /health                      # Health check
GET    /ready                       # Readiness check (K8s)
GET    /live                        # Liveness check (K8s)
GET    /info                        # System information
```

## 🏗️ **Project Structure**

```
src/
├── config/           # Configuration management
│   ├── index.ts      # Main config with validation
│   ├── database.ts   # Database connection
│   └── server.ts     # Server options
├── types/            # TypeScript types & schemas
│   ├── property.ts   # Property-related types
│   └── common.ts     # Common types & errors
├── utils/            # Utility functions
│   ├── validation.ts # Validation helpers
│   ├── transform.ts  # Data transformation
│   └── logger.ts     # Logging utilities
├── middlewares/      # HTTP middlewares
│   ├── cors.ts       # CORS handling
│   ├── error-handler.ts # Global error handling
│   └── validation.ts # Request validation
├── repositories/     # Data access layer
│   └── property.repository.ts
├── services/         # Business logic layer
│   └── property.service.ts
├── controllers/      # HTTP request handlers
│   └── property.controller.ts
├── routes/           # Route definitions
│   ├── properties.ts # Property routes
│   ├── health.ts     # Health check routes
│   └── index.ts      # Route registration
├── app.ts           # Application setup
└── server.ts        # Server entry point
```

## 🔧 **Configuration**

### Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=8082
HOST=0.0.0.0

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/properties_db"
DB_MAX_CONNECTIONS=10

# CORS
CORS_ORIGIN="http://localhost:3001,http://localhost:3000"

# Rate Limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW="1 minute"

# Logging
LOG_LEVEL=info

# Redis (Optional - for advanced rate limiting)
REDIS_URL="redis://localhost:6379"
CACHE_TTL=300

# Business Rules
MAX_PRICE=100000000
MAX_PROPERTY_TITLE_LENGTH=200
MAX_PROPERTY_DESCRIPTION_LENGTH=2000
```

## 🧪 **Testing**

```bash
# Run tests
yarn test

# Run tests in watch mode
yarn test:watch

# Generate coverage report
yarn test:coverage

# Type checking
yarn type-check

# Linting
yarn lint
yarn lint:fix
```

## 📝 **Development Scripts**

```bash
# Development
yarn dev              # Start dev server with hot reload
yarn build            # Build for production
yarn start            # Start production server

# Database
yarn prisma:generate  # Generate Prisma client
yarn prisma:migrate:dev    # Create and apply migration
yarn prisma:migrate:deploy # Apply migrations (production)
yarn prisma:studio    # Open Prisma Studio
yarn prisma:reset     # Reset database
yarn db:seed          # Seed sample data

# Quality
yarn lint             # Check code style
yarn lint:fix         # Fix code style issues
yarn type-check       # TypeScript validation
yarn test             # Run test suite

# Docker
yarn docker:build    # Build Docker image
yarn docker:run      # Run Docker container
```

## 🐳 **Docker Deployment**

```bash
# Build image
docker build -t properties-service .

# Run container
docker run -p 8082:8082 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  properties-service

# Using Docker Compose (from project root)
docker-compose up properties-service
```

## 📊 **Performance Considerations**

### Database Optimizations
- **Indexed fields**: `status`, `type`, `price`, `location`, `createdAt`
- **Composite indexes** for common filter combinations
- **Full-text search** indexes for search queries
- **Connection pooling** with configurable limits

### API Optimizations
- **Cursor-based pagination** for efficient large dataset handling
- **Rate limiting** to prevent abuse
- **Response caching** headers
- **Request/Response compression**

### Memory Management
- **Graceful shutdown** handling
- **Memory usage monitoring**
- **Connection cleanup**

## 🔒 **Security Best Practices**

### Input Validation
- **Zod schemas** for all inputs
- **UUID validation** for IDs
- **Business rule validation** (price limits, etc.)
- **SQL injection** protection via Prisma

### HTTP Security
- **CORS** with origin validation
- **Security headers** (HSTS, CSP, etc.)
- **Rate limiting** per IP
- **Request sanitization**

## 📈 **Monitoring & Observability**

### Logging
- **Structured logging** with Pino
- **Request correlation** IDs
- **Performance metrics** (response times, memory usage)
- **Error tracking** with stack traces

### Health Checks
- **Database connectivity** checks
- **Memory/CPU monitoring**
- **Kubernetes-ready** endpoints

## 🚀 **Deployment**

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health checks working
- [ ] Logging configured
- [ ] Performance monitoring set up
- [ ] Security headers configured
- [ ] Rate limiting configured

### Kubernetes Deployment
```yaml
# Example readiness probe
readinessProbe:
  httpGet:
    path: /ready
    port: 8082
  initialDelaySeconds: 10
  periodSeconds: 5

# Example liveness probe  
livenessProbe:
  httpGet:
    path: /live
    port: 8082
  initialDelaySeconds: 30
  periodSeconds: 10
```

## 🤝 **Contributing**

1. Follow the established architecture patterns
2. Add tests for new functionality
3. Update documentation
4. Follow TypeScript best practices
5. Use structured logging
6. Handle errors gracefully

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ by the Real Estate Development Team.
