# syntax=docker/dockerfile:1.7
FROM node:22.23.5-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /workspace

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @magina/database build \
    && pnpm --filter @magina/api build

FROM base AS production-dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --prod --frozen-lockfile --filter @magina/api...

FROM node:22.23.5-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /workspace
RUN mkdir -p /data/uploads && chown -R node:node /data
COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /workspace/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=production-dependencies --chown=node:node /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=production-dependencies --chown=node:node /workspace/packages/database/package.json ./packages/database/package.json
COPY --from=build --chown=node:node /workspace/apps/api/dist ./apps/api/dist
COPY --from=build --chown=node:node /workspace/packages/database/dist ./packages/database/dist
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /pnpm /root/.cache/node/corepack \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/yarn /usr/local/bin/yarnpkg
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/main.js"]

FROM build AS ops
ENV NODE_ENV=production
ENV UPLOADS_DIR=/data/uploads
RUN mkdir -p /data/uploads && chown -R node:node /data \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /pnpm /root/.cache/node/corepack \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/yarn /usr/local/bin/yarnpkg
USER node
CMD ["sh", "-c", "cd packages/database && node node_modules/drizzle-kit/bin.cjs migrate"]
