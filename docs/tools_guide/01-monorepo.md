# Monorepo

## 1. Đây là gì?

Monorepo = **một kho code duy nhất** chứa nhiều phần ứng dụng (web, mobile, nhiều backend service) thay vì tách thành nhiều repo riêng.

Hình dung: một ngôi nhà có nhiều phòng — mỗi phòng làm việc khác nhau, nhưng cùng một địa chỉ.

## 2. Vai trò trong dự án

Project học tiếng Hàn cần web, mobile, API Gateway và 5 service. Để team nhỏ dễ chia sẻ type/config và mở cùng một workspace, mọi thứ nằm trong một repo:

- `apps/` — ứng dụng chạy được (web, mobile, gateway, services)
- `packages/` — mảnh code dùng chung tối thiểu
- `infrastructure/` — Docker, Postgres, RabbitMQ
- `docs/` — tài liệu kiến trúc & hướng dẫn

## 3. Cách thức hoạt động

`pnpm-workspace.yaml` bảo pnpm: “mọi thư mục trong `apps/*` và `packages/*` đều là package của workspace”. Cài dependency một lần ở root; từng app vẫn có `package.json` riêng.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
# Cài dependency cho toàn monorepo
corepack pnpm install

# Chạy script typecheck ở mọi package
corepack pnpm typecheck

# Chạy script của một package cụ thể
corepack pnpm --filter @korean-learning/user-service typecheck
```

## 5. Ví dụ thực tế từ Source Code

[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml):

```yaml
# This file defines the packages included in the monorepo workspace.
packages:
  - "apps/*"
  - "packages/*"
```
