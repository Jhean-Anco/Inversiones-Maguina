# syntax=docker/dockerfile:1.7
FROM node:22.23.5-bookworm-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm --filter @magina/web build

FROM nginx:1.30.6-alpine3.24 AS web
ARG BUILD_SHA=local
RUN apk upgrade --no-cache && rm -rf /var/cache/apk/*
LABEL org.opencontainers.image.revision=${BUILD_SHA}
ARG VITE_API_URL
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
RUN test -n "$VITE_API_URL" && sed -i "s|__API_ORIGIN__|$VITE_API_URL|g" /etc/nginx/snippets/security-headers.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
RUN printf '{"sha":"%s"}\n' "$BUILD_SHA" > /usr/share/nginx/html/build-info.json
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/health || exit 1
