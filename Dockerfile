# One Render service. Leave Root Directory empty so Render finds this file.
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv nginx gettext-base openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /opt/venv

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY assets ./assets
COPY infrastructure/docker/all-in-one ./infrastructure/docker/all-in-one

RUN corepack enable \
  && corepack prepare pnpm@10.14.0 --activate \
  && pnpm install --frozen-lockfile --prod=false

ARG GOOGLE_CLIENT_ID=
ARG VITE_GOOGLE_CLIENT_ID=

RUN VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-$GOOGLE_CLIENT_ID}" \
  pnpm --filter @korean-learning/web exec vite build \
  && mkdir -p /usr/share/nginx/html \
  && cp -a apps/web/dist/. /usr/share/nginx/html/ \
  && /opt/venv/bin/pip install --no-cache-dir -r apps/user-service/requirements.txt -r apps/ai-service/requirements.txt \
  && chmod +x /app/infrastructure/docker/all-in-one/start.sh

EXPOSE 10000

CMD ["/app/infrastructure/docker/all-in-one/start.sh"]
