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

# Yarn Berry via Corepack - forçar versão específica
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Copiar manifesto primeiro para melhor cache
COPY package.json ./

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

# Dependências runtime mínimas
RUN apk add --no-cache \
    openssl \
    curl \
    libc6-compat

# Yarn não é necessário no runtime; remover dependência de rede

# Criar usuário não-root
RUN addgroup -S nodejs && adduser -S nodeuser -G nodejs

# Copiar artefactos do build
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Preparar diretórios de logs e permissões
RUN mkdir -p /app/logs && \
    chown -R nodeuser:nodejs /app

# Copy entrypoint and make executable before dropping privileges
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

USER nodeuser

EXPOSE 8085

# Health check (align with compose path)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8085/api/v1/health || exit 1

ENTRYPOINT ["sh", "/app/docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]