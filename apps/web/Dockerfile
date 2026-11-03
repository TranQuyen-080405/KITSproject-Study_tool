# Build context is this directory. On Render, set Root Directory to apps/web.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --ignore-scripts

COPY . .

ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN npx vite build

FROM nginx:1.27-alpine

ENV PORT=80
ENV API_GATEWAY_URL=https://kits-api-gateway-demo.onrender.com
ENV API_GATEWAY_HOST=kits-api-gateway-demo.onrender.com

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
