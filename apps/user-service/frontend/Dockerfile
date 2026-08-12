FROM node:22-alpine AS build

WORKDIR /app
COPY apps/user-service/frontend/package.json ./package.json
RUN npm install
COPY apps/user-service/frontend ./

ARG VITE_API_URL=http://localhost:8001/api/v1
ARG VITE_GOOGLE_CLIENT_ID=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

FROM nginx:1.27-alpine
COPY apps/user-service/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
