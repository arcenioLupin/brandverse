FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
RUN pnpm fetch
CMD ["node","-e","console.log('worker image ready')"]
