FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/package.json
COPY shared/tsconfig.json ./shared/tsconfig.json
COPY shared/src ./shared/src
COPY api/package.json ./api/package.json
COPY api/tsconfig.json ./api/tsconfig.json
COPY api/drizzle.config.ts ./api/drizzle.config.ts
COPY api/src ./api/src

RUN apk add --no-cache python3 make g++

RUN npm install
RUN npm run build --workspace shared && npm run build --workspace api

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
COPY api/package.json ./api/package.json
COPY shared/package.json ./shared/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/dist ./api/dist
COPY --from=builder /app/shared/dist ./shared/dist
COPY api/src/db ./api/src/db

RUN mkdir -p /data/uploads /data/backups /data/sqlite

EXPOSE 3000

CMD ["node", "api/dist/src/index.js"]
