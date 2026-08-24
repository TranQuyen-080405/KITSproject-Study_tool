FROM node:22-alpine

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

ENV CONTENT_DATABASE_URL=postgresql://postgres:postgres@content-postgres:5432/content_service

RUN corepack enable \
  && pnpm install --frozen-lockfile

ENV PORT=3001
EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "pnpm --filter @korean-learning/content-service db:deploy && exec pnpm --filter @korean-learning/content-service start"]
