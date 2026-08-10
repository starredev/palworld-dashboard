# syntax=docker/dockerfile:1

# Build from the repo root: `docker build -f docs/Dockerfile .`
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
COPY docs/package.json ./docs/
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---- Build the static docs site ----
FROM deps AS build
COPY docs ./docs
RUN pnpm --filter @tsuki/docs docs:build

# ---- Serve with nginx ----
FROM nginx:alpine AS runner
COPY docs/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/docs/.vitepress/dist /usr/share/nginx/html
EXPOSE 80
