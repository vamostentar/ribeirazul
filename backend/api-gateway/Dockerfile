# Simple Node.js image for development
FROM node:22-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Enable corepack for yarn - forçar versão específica
RUN corepack enable && corepack prepare yarn@4.9.2 --activate

# Copy package files (include lockfile)
COPY package.json yarn.lock* .yarnrc.yml ./

# Avoid traversing to parent for workspaces during install
ENV YARN_IGNORE_PATH=1

# Install dependencies
RUN yarn --version && yarn install

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

# Start the application
CMD ["yarn", "start"]