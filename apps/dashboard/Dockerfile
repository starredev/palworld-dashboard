# syntax=docker/dockerfile:1

# Build from the repo root: `docker build -f apps/dashboard/Dockerfile .`
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

# ---- Build the static site ----
FROM deps AS build
# Baked into the bundle at build time — must be reachable from the browser.
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL
# Optional: absolute URL of the palworld-live-map. Empty = same host on :3001.
ARG VITE_LIVEMAP_URL=
ENV VITE_LIVEMAP_URL=$VITE_LIVEMAP_URL
COPY packages ./packages
COPY apps/dashboard ./apps/dashboard
RUN pnpm --filter @tsuki/dashboard build

# ---- Serve with nginx ----
FROM nginx:alpine AS runner
COPY apps/dashboard/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/dashboard/dist /usr/share/nginx/html
EXPOSE 80
