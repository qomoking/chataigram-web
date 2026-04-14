# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (version pinned in package.json)
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Install deps first (cache layer — only re-runs when lockfile changes)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy sources (submodule content must be populated before docker build)
COPY packages/core packages/core
COPY src src
COPY public public
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./

# Build args (override with --build-arg at build time)
ARG VITE_USE_MOCKS=false
ENV VITE_USE_MOCKS=$VITE_USE_MOCKS

RUN pnpm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# gettext provides envsubst for runtime config templating
RUN apk add --no-cache gettext

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

# Default: proxy /api → service named "api" on port 8000 (docker-compose)
# Override with: -e API_UPSTREAM=127.0.0.1:9080  for bare-metal backend
ENV API_UPSTREAM=api:8000

EXPOSE 80

# Substitute only $API_UPSTREAM, leave nginx vars ($uri, $host …) untouched
CMD ["/bin/sh", "-c", \
  "envsubst '$API_UPSTREAM' \
     < /etc/nginx/templates/default.conf.template \
     > /etc/nginx/conf.d/default.conf \
   && nginx -g 'daemon off;'"]
