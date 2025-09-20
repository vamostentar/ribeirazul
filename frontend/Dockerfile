FROM node:22-alpine

WORKDIR /app

# Enable corepack for Yarn
RUN corepack enable

COPY package.json yarn.lock* .yarnrc.yml ./
RUN corepack yarn install --immutable || corepack yarn install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
# Build the application with environment variables
RUN corepack yarn build

EXPOSE 3001

CMD ["corepack", "yarn", "dev", "--host"]