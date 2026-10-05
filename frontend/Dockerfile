# syntax=docker/dockerfile:1

# Build context is the repository root so the workspace lockfile can be used.
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Lifecycle scripts stay enabled: Vite's build depends on esbuild's postinstall to
# place its native binary.
RUN mkdir -p backend frontend && npm ci

COPY frontend ./frontend

# The API base URL is baked in at build time by Vite, so it has to be supplied here.
# /api keeps the browser on the same origin as the API, which is what makes the
# SameSite=Lax auth cookie work.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build --workspace @refon/frontend

FROM nginx:1.27-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]