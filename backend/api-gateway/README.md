# 🚀 Ribeira Azul API Gateway

Enterprise-grade API Gateway for the Ribeira Azul Real Estate Platform, providing centralized routing, authentication, rate limiting, and monitoring for all microservices.

## 🏗️ Architecture

The API Gateway acts as a single entry point for all client requests, providing:

- **Service Routing**: Intelligent routing to microservices
- **Authentication & Authorization**: JWT-based security
- **Rate Limiting**: Protect services from abuse
- **Health Monitoring**: Real-time service health checks
- **Request/Response Transformation**: Data transformation and validation
- **Logging & Monitoring**: Centralized observability
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with TypeScript
- **Framework**: Fastify 4 (High-performance web framework)
- **Proxy**: @fastify/http-proxy
- **Security**: Helmet, CORS, JWT, Rate Limiting
- **Documentation**: Swagger/OpenAPI 3.0
- **Logging**: Pino (Structured JSON logging)
- **Validation**: Zod schemas
- **Development**: tsx, Yarn 4, ESLint, Prettier

## 📁 Project Structure

src/
├── config/          # Configuration management
├── middlewares/     # Custom middleware functions
├── routes/          # Route handlers
├── services/        # Business logic services
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
├── app.ts           # Fastify application setup
└── server.ts        # Server startup and configuration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Yarn 4+ (via corepack)
- Running Properties Service (port 8082)

### Installation

```bash
# Enable Yarn 4
corepack enable

# Install dependencies
yarn install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Development

```bash
# Start in development mode (with hot reload)
yarn dev

# Build for production
yarn build

# Start production build
yarn start
```

### Docker

```bash
# Build Docker image
docker build -t ribeirazul-api-gateway .

# Run container
docker run -p 8081:8081 --env-file .env ribeirazul-api-gateway
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `8081` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `CORS_ORIGIN` | `http://localhost:3001` | Allowed CORS origins |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `RATE_LIMIT_WINDOW` | `1 minute` | Rate limit time window |
| `JWT_SECRET` | *required* | JWT signing secret |
| `PROPERTIES_SERVICE_URL` | `http://localhost:8082` | Properties service URL |
| `SWAGGER_ENABLED` | `true` | Enable API documentation |

### Service Configuration

Services are configured in `src/services/proxy.service.ts`:

```typescript
{
  prefix: '/api/v1/properties',
  target: 'http://localhost:8082',
  serviceName: 'properties',
  timeout: 10000,
}
```

## 📋 API Endpoints

### Core Gateway Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Gateway information |
| `GET` | `/health` | Health check with service status |
| `GET` | `/ready` | Kubernetes readiness probe |
| `GET` | `/live` | Kubernetes liveness probe |
| `GET` | `/documentation` | Swagger UI |

### Proxied Service Routes

| Prefix | Target Service | Description |
|--------|----------------|-------------|
| `/api/v1/properties/*` | Properties Service | Property management endpoints |

## 🔐 Authentication

The gateway supports JWT-based authentication:

```bash
# Get a JWT token (from auth service)
curl -X POST http://localhost:8081/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Use token in requests
curl -H "Authorization: Bearer <jwt_token>" \
  http://localhost:8081/api/v1/properties
```

## 🏥 Health Monitoring

### Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "properties": {
      "status": "up",
      "responseTime": 45,
      "lastChecked": "2024-01-15T10:30:00.000Z",
      "version": "1.0.0"
    }
  },
  "uptime": 86400000,
  "version": "1.0.0",
  "environment": "development"
}
```

### Status Codes

- `200` - All services healthy
- `207` - Some services degraded  
- `503` - Critical services down

## 📊 Monitoring & Observability

### Structured Logging

All requests are logged with structured JSON:

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "requestId": "req_123",
  "method": "GET",
  "url": "/api/v1/properties",
  "responseTime": 150,
  "statusCode": 200,
  "component": "http"
}
```

### Request Context

Every request includes tracking headers:

- `X-Request-ID`: Unique request identifier
- `X-Correlation-ID`: Cross-service correlation
- `X-Gateway-Version`: Gateway version

## 🛡️ Security Features

- **Helmet**: Security headers (CSP, HSTS, etc.)
- **CORS**: Configurable cross-origin requests
- **Rate Limiting**: Prevent abuse and DDoS
- **JWT Validation**: Secure authentication
- **Request Validation**: Zod schema validation
- **Security Headers**: Comprehensive header protection

## 🚦 Rate Limiting

Default limits:
-100 requests per minute per IP
-Configurable via environment variables
-Custom error responses

## 📈 Performance

- **High Throughput**: Fastify performance (~65k req/sec)
- **Low Latency**: Optimized proxy forwarding
- **Memory Efficient**: Minimal overhead design
- **Connection Pooling**: Efficient service connections

## 🔄 Circuit Breaker (Planned)

Future implementation will include:
-Automatic failure detection
-Service fallback mechanisms
 Recovery monitoring

## 🐳 Docker Support

Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api-gateway
```

### Production

```bash
# Production build
docker build -t ribeirazul-api-gateway:latest .

# Run with proper environment
docker run -d \
  --name api-gateway \
  -p 8081:8081 \
  --env-file .env.production \
  ribeirazul-api-gateway:latest
```

## 🧪 Testing

```bash
# Run tests
yarn test

# Run with coverage
yarn test:coverage

# Type checking
yarn type-check

# Linting
yarn lint
yarn lint:fix
```

## 🛠️ Development

### Adding New Services

1. Update `src/services/proxy.service.ts`:

```typescript
{
  prefix: '/api/v1/newservice',
  target: process.env.NEWSERVICE_URL,
  serviceName: 'newservice',
  timeout: 10000,
}
```

2.Add health check configuration
3. Update documentation

### Custom Middleware

Create middleware in `src/middlewares/`:

```typescript
export const customMiddleware: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    // Custom logic
  });
};
```

## 🚀 Deployment

### Production Checklist

- [ ] Set strong `JWT_SECRET`
- [ ] Configure proper `CORS_ORIGIN`
- [ ] Set `NODE_ENV=production`
- [ ] Configure service URLs
- [ ] Setup monitoring/logging
- [ ] Configure rate limits
- [ ] Setup health checks

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: ribeirazul-api-gateway:latest
        ports:
        - containerPort: 8081
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /live
            port: 8081
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: `/documentation` endpoint
- **Health Status**: `/health` endpoint
- **Issues**: Create GitHub issue
- **Email**:

---

🏠 Built with ❤️ for Ribeira Azul Real Estate Platform
