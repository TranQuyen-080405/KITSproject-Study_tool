# Build context is this directory. On Render, set Root Directory to apps/api-gateway.
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY src ./src

ENV PORT=3000
EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
