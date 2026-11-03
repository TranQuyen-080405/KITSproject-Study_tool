# Build context is this directory. On Render, set Root Directory to apps/web.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY . .

ARG GOOGLE_CLIENT_ID=
ARG VITE_GOOGLE_CLIENT_ID=
RUN VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-$GOOGLE_CLIENT_ID}" npx vite build

FROM nginx:1.27-alpine

ENV PORT=80
ENV API_GATEWAY_URL=https://kitsproject-study-tool.onrender.com
ENV API_GATEWAY_HOST=kitsproject-study-tool.onrender.com

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.d/25-gateway-host.sh /docker-entrypoint.d/25-gateway-host.sh
RUN chmod +x /docker-entrypoint.d/25-gateway-host.sh
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
