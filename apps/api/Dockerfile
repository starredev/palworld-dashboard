# syntax=docker/dockerfile:1

# Build from the repo root: `docker build -f apps/api/Dockerfile .`
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# ---- Install deps (cached on manifests) ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/shared/package.json ./packages/shared/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/
COPY apps/api/package.json ./apps/api/
COPY apps/dashboard/package.json ./apps/dashboard/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build + prune to a self-contained prod bundle ----
FROM deps AS build
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @tsuki/api build
RUN pnpm --filter @tsuki/api --prod deploy --legacy /app

# ---- Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
# Own the backups mount point as `node` so the named volume is seeded with
# node:node ownership (Docker copies the image dir's perms into a fresh volume),
# letting the non-root process write save backups.
RUN mkdir -p /backups && chown node:node /backups
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
