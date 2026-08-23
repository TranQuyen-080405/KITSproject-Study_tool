FROM node:22-alpine
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
RUN corepack enable && pnpm install --no-frozen-lockfile
ENV PORT=3003
ENV ANALYTICS_DATA_FILE=/data/analytics.json
VOLUME ["/data"]
EXPOSE 3003
CMD ["pnpm", "--filter", "@korean-learning/analytics-service", "dev"]
