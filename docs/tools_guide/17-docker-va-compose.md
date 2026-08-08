# Docker & Docker Compose

## 1. Đây là gì?

Docker = chạy ứng dụng trong **hộp cách ly** (container) giống nhau trên mọi máy.  
Docker Compose = file mô tả **nhiều container** chạy cùng lúc (gateway, services, Postgres, RabbitMQ).

## 2. Vai trò trong dự án

`docker-compose.yml` là bản phác thảo môi trường local: 6 app backend + RabbitMQ + 5 Postgres. Mục tiêu hiện tại là **cấu trúc phát triển**, chưa phải production sẵn sàng.

## 3. Cách thức hoạt động

Compose đọc `docker-compose.yml` → build/pull image → tạo network/volume → start service theo khai báo `ports`, `command`, `environment`.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
docker compose up
docker compose up -d
docker compose down
docker compose ps
docker compose logs -f api-gateway
```

## 5. Ví dụ thực tế từ Source Code

[`docker-compose.yml`](../../docker-compose.yml) (rút gọn):

```yaml
services:
  api-gateway:
    build:
      context: .
      dockerfile: infrastructure/docker/Dockerfile.service
    command: ["pnpm", "--filter", "@korean-learning/api-gateway", "dev"]
    ports:
      - "3000:3000"

  rabbitmq:
    image: rabbitmq:4-management
```
