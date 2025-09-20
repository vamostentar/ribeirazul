############################
# Builder
############################
FROM node:22-alpine AS builder

WORKDIR /app

# Dependências de build (sharp, prisma engines, etc.)
RUN apk add --no-cache \
    vips-dev \
    build-base \
    python3 \
    make \
    g++

# Yarn Berry via Corepack - forçar versão específica
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Copiar manifestos primeiro para melhor cache
COPY package.json yarn.lock ./

# Forçar nodeLinker node-modules para compat com Docker
RUN echo "nodeLinker: node-modules" > .yarnrc.yml && \
    echo "enableTelemetry: false" >> .yarnrc.yml

# Evitar herdar workspaces da raiz
ENV YARN_IGNORE_PATH=1

# Verificar versão do Yarn e instalar deps
RUN yarn --version && yarn install

# Copiar código
COPY . .

# Gerar Prisma Client e compilar TS
RUN yarn prisma:generate && yarn build

############################
# Runtime
############################
FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Dependências runtime mínimas (sharp runtime)
RUN apk add --no-cache \
    vips \
    openssl \
    curl \
    libc6-compat

# Garantir versão correta do Yarn no runtime também
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Criar usuário não-root
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copiar artefactos do build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Preparar diretórios de uploads e permissões
RUN mkdir -p /app/uploads/properties/images /app/uploads/properties/thumbnails && \
    chown -R nodeuser:nodejs /app

USER nodeuser

EXPOSE 8082

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8082/health || exit 1

CMD ["node", "dist/server.js"]