# Build context is this directory. On Render, set Root Directory to apps/analytics-service.
FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
RUN npx prisma generate --config prisma.config.ts

ENV PORT=3003
ENV ANALYTICS_DATA_FILE=/data/analytics.json
VOLUME ["/data"]
EXPOSE 3003

HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3003)+'/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npm run db:deploy && npm run db:import-json && exec npm start"]
