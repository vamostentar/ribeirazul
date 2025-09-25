############################
# Builder
############################
FROM node:22-alpine AS builder

WORKDIR /app

# Dependências de build
RUN apk add --no-cache \
    build-base \
    python3 \
    make \
    g++ \
    openssl

# Enable corepack for yarn
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Copy package files
COPY package.json ./

# Force node-modules linker for Docker compatibility
RUN echo "nodeLinker: node-modules" > .yarnrc.yml && \
    echo "enableTelemetry: false" >> .yarnrc.yml

# Install dependencies
RUN yarn install

# Copy source code
COPY . .

# Generate Prisma client and build TypeScript (includes compiling prisma/seed.ts to dist/prisma/seed.js)
RUN yarn prisma:generate && yarn build

############################
# Runtime
############################
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Dependências runtime mínimas
RUN apk add --no-cache \
    openssl \
    curl \
    libc6-compat \
    bash \
    postgresql-client \
    su-exec

# Yarn não é necessário no runtime; remover dependência de rede

# Criar usuário não-root
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copiar artefactos do build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Script de entrada para executar migrações e iniciar o servidor
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
# Normalizar final de linha (CRLF -> LF) para evitar erro "set: illegal option -"
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

# Preparar diretórios de logs e permissões
RUN mkdir -p /app/logs && \
    chown -R nodeuser:nodejs /app

# Mantém como root para executar migrações, o entrypoint muda para nodeuser após migrações

EXPOSE 8084

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8084/health || exit 1

# Use entrypoint script to wait for dependencies and run migrations reliably
ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
