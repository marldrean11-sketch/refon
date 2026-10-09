# syntax=docker/dockerfile:1

# Build context is the repository root so the workspace lockfile can be used.
# Stage 1 installs every workspace dependency, including the dev dependencies Prisma
# needs to generate a client.
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# openssl is required by Prisma's query engine on Debian-based images.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Lifecycle scripts stay enabled: Prisma downloads its engines in postinstall.
# npm workspaces hoist every package to the root `node_modules`, so
# `backend/node_modules` is usually not created. It is made explicitly so the
# later `COPY --from=deps` of it always has a source, hoisted or not.
RUN mkdir -p backend frontend && npm ci && mkdir -p backend/node_modules

# Stage 2 generates the Prisma client, which needs the dev-only prisma CLI.
FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY package.json package-lock.json ./
COPY backend ./backend

ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npx prisma generate --schema backend/prisma/schema.prisma

# Stage 3 resolves a production-only dependency tree from the same lockfile.
FROM node:22-bookworm-slim AS prod-deps

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# `npm ci` refuses to run without a directory for each workspace member. The
# trailing mkdir has the same reason as in the deps stage: hoisting leaves no
# `backend/node_modules` for the runtime stage to copy.
RUN mkdir -p backend frontend && npm ci --omit=dev && mkdir -p backend/node_modules

# The entrypoint applies migrations with `prisma migrate deploy`, but prisma is a
# root devDependency and therefore absent from the pruned tree above. It is added
# without saving so it never reaches package.json, which keeps a deliberate
# separation: production code never depends on the migration tooling at import time.
RUN npm install --no-save --omit=dev prisma@6.12.0

# Stage 4 is the runtime: production dependencies only, no toolchain, non-root.
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--enable-source-maps

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/backend/node_modules ./backend/node_modules
# The generated Prisma client lives in `node_modules/.prisma`, written by the
# build stage. Without it the API stops at startup with "@prisma/client did not
# initialize yet".
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY package.json package-lock.json ./
COPY backend ./backend
COPY docker/backend-entrypoint.sh /usr/local/bin/backend-entrypoint.sh

# Seed illustrations arrive with `COPY backend` (.dockerignore keeps only
# `uploads/seed` from the uploads folder). They used to be copied onto themselves
# here, which `cp` rejects as "the same file" and which failed the build.
#
# `backend/tmp` (the mail outbox) is created here, owned by `node`: the entrypoint
# runs as `node` and cannot create it under the root-owned /app/backend, and a
# compose volume mounted on a path missing from the image is created root-owned.
RUN mkdir -p /app/backend/uploads/seed /app/backend/tmp \
 && touch /app/backend/uploads/.gitkeep \
 && chmod +x /usr/local/bin/backend-entrypoint.sh \
 && chown -R node:node /app/backend/uploads /app/backend/tmp /usr/local/bin/backend-entrypoint.sh

USER node

EXPOSE 4000

# Uses /api/health so a failure means the database is unreachable, not merely that the
# process is alive.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/api/health || exit 1

ENTRYPOINT ["backend-entrypoint.sh"]
CMD ["node", "backend/src/index.js"]