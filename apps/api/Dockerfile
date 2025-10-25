FROM node:20-alpine AS base
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@9.7.0 --activate
RUN pnpm fetch
# Dummy: no app aún, pero el build pasará
CMD ["node","-e","console.log('api image ready')"]
