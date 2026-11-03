# Backend Render service. Leave Root Directory empty.
# Starts the gateway, user, content, AI, and analytics. Web is a separate service.
# Set POSTGRES_URL, LLM_API_KEY, LLM_MODEL, and LLM_BASE_URL on the service. See .env.example.
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-venv openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && python3 -m venv /opt/venv

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY infrastructure/docker/all-in-one ./infrastructure/docker/all-in-one

RUN corepack enable \
  && corepack prepare pnpm@10.14.0 --activate \
  && pnpm install --frozen-lockfile --prod=false \
  && /opt/venv/bin/pip install --no-cache-dir -r apps/user-service/requirements.txt -r apps/ai-service/requirements.txt \
  && chmod +x /app/infrastructure/docker/all-in-one/start.sh

EXPOSE 10000

CMD ["/app/infrastructure/docker/all-in-one/start.sh"]
