FROM node:22-alpine

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN corepack enable && pnpm install --frozen-lockfile

ENV PORT=3003
ENV ANALYTICS_DATA_FILE=/data/analytics.json

VOLUME ["/data"]
EXPOSE 3003

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3003/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "--filter", "@korean-learning/analytics-service", "start"]
