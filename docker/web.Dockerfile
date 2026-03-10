FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY tsconfig.base.json ./
COPY shared/package.json ./shared/package.json
COPY shared/tsconfig.json ./shared/tsconfig.json
COPY shared/src ./shared/src
COPY web/package.json ./web/package.json
COPY web/tsconfig.json ./web/tsconfig.json
COPY web/tsconfig.app.json ./web/tsconfig.app.json
COPY web/tsconfig.node.json ./web/tsconfig.node.json
COPY web/vite.config.ts ./web/vite.config.ts
COPY web/postcss.config.js ./web/postcss.config.js
COPY web/tailwind.config.ts ./web/tailwind.config.ts
COPY web/index.html ./web/index.html
COPY web/public ./web/public
COPY web/src ./web/src

RUN npm install
RUN npm run build --workspace shared && npm run build --workspace web

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/web/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
