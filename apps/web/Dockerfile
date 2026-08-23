# Production image for the KITS web client (static build + nginx).
FROM node:22-alpine AS build

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages ./packages
COPY assets ./assets

# Install before build; do not COPY apps/web again afterward (wipes node_modules).
RUN corepack enable && pnpm install --frozen-lockfile --filter @korean-learning/web...

ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Vite bundles the app; typecheck stays a host/CI step.
RUN corepack pnpm --filter @korean-learning/web exec vite build

FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80
