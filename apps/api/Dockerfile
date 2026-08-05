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

# ---- Build libooz: open-source Oodle decompressor for the new PlM save format ----
# Palworld's 2026 "Tides of Terraria" update switched dedicated-server saves from
# zlib (PlZ) to Oodle (PlM). libooz (github.com/zao/ooz) is a clean-room Kraken/
# Mermaid decompressor — NOT Epic/RAD's proprietary oo2core. Built musl-side so it
# loads in the alpine runner. Pinned; bump OOZ_REF to update.
FROM alpine:3.20 AS ooz
RUN apk add --no-cache git cmake make g++ musl-dev linux-headers
ARG OOZ_REF=ff5aeb9e45e362e8d6bb1199aa82406285dd2a18
RUN git clone https://github.com/zao/ooz.git /src \
 && cd /src && git checkout ${OOZ_REF} && git submodule update --init simde \
 && cmake -S /src -B /src/build -DCMAKE_BUILD_TYPE=Release \
      -DOOZ_BUILD_BUN=OFF -DOOZ_BUILD_EXE=OFF -DOOZ_BUILD_VALIDATE=OFF \
 && cmake --build /src/build --target libooz -j "$(nproc)" \
 && cp "$(find /src/build -name 'lib*ooz*.so' | head -1)" /libooz.so

# ---- Runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./

# Save-file editor: Python 3 + palworld-save-tools v0.24.0, patched for the new
# Oodle (PlM) save format. We overlay quadrantbs' hostfix palsav.py (reads PlM
# via libooz, writes back as plain zlib — which the game still loads, so no Oodle
# *compression* is ever needed) and copy in the libooz.so built above. Pinned refs.
ARG SAVE_TOOLS_REF=v0.24.0
ARG HOSTFIX_REF=306dd72f73b09c815b91b3744c1a297c3074dc3b
RUN apk add --no-cache python3 libstdc++ libgcc
COPY --from=ooz /libooz.so /opt/ooz/libooz.so
ENV PALWORLD_OOZ_DLL_PATH=/opt/ooz/libooz.so
ADD https://github.com/cheahjs/palworld-save-tools/archive/refs/tags/${SAVE_TOOLS_REF}.tar.gz /tmp/pst.tar.gz
ADD https://github.com/quadrantbs/palworld-hostfix-toolkit/archive/${HOSTFIX_REF}.tar.gz /tmp/hostfix.tar.gz
RUN mkdir -p /opt/palworld-save-tools /tmp/hostfix \
 && tar -xzf /tmp/pst.tar.gz -C /opt/palworld-save-tools --strip-components=1 \
 && tar -xzf /tmp/hostfix.tar.gz -C /tmp/hostfix --strip-components=1 \
 && cp /tmp/hostfix/patched_palworld_save_tools/palsav.py \
       /opt/palworld-save-tools/palworld_save_tools/palsav.py \
 && rm -rf /tmp/pst.tar.gz /tmp/hostfix.tar.gz /tmp/hostfix

# Own the backups mount point as `node` so the named volume is seeded with
# node:node ownership (Docker copies the image dir's perms into a fresh volume),
# letting the non-root process write save backups.
RUN mkdir -p /backups && chown node:node /backups
EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]
