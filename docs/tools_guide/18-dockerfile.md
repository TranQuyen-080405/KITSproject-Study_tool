# Dockerfile

## 1. Đây là gì?

Dockerfile là **công thức nấu image**: bắt đầu từ image gốc (Node), copy code, cài dependency, chọn lệnh chạy mặc định. Docker dùng file này để build container.

## 2. Vai trò trong dự án

Có hai template dưới `infrastructure/docker/`:

- `Dockerfile.service` — backend services  
- `Dockerfile.client` — client apps  

`docker-compose.yml` trỏ `dockerfile: infrastructure/docker/Dockerfile.service` cho các service.

## 3. Cách thức hoạt động

Các lệnh phổ biến trong Dockerfile chạy tuần tự: `FROM` → `WORKDIR` → `COPY` → `RUN` → `CMD`. Kết quả là image tái sử dụng được.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
docker build -f infrastructure/docker/Dockerfile.service -t korean-learning-service .
```

Từ khóa: `FROM`, `WORKDIR`, `COPY`, `RUN`, `CMD`, `EXPOSE`.

## 5. Ví dụ thực tế từ Source Code

[`infrastructure/docker/Dockerfile.service`](../../infrastructure/docker/Dockerfile.service):

```dockerfile
# This Dockerfile is the shared development image template for Node.js backend services.
FROM node:22-alpine

WORKDIR /workspace

COPY package.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages

RUN corepack enable && pnpm install --no-frozen-lockfile

CMD ["sh"]
```
