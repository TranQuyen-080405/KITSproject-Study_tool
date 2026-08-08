# Node.js

## 1. Đây là gì?

Node.js là **môi trường chạy JavaScript/TypeScript ở phía máy chủ** (không phải trong trình duyệt). Nhờ Node, backend Express của project mới chạy được trên máy bạn hoặc trong Docker.

## 2. Vai trò trong dự án

Toàn bộ API Gateway và các microservice backend dùng Node.js + Express + TypeScript. Mobile/web cũng thuộc hệ sinh thái JavaScript, nên team dùng chung một ngôn ngữ chính.

Dockerfile backend cũng dựa trên image Node:

```text
FROM node:22-alpine
```

## 3. Cách thức hoạt động

Bạn cài Node → dùng Corepack/pnpm cài thư viện → chạy script trong `package.json` (ví dụ `dev`, `typecheck`). Node đọc file JS/TS đã biên dịch hoặc chạy qua `tsx`.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
node --version          # xem phiên bản Node
corepack enable         # bật trình quản lý package đi kèm Node
corepack pnpm --version # dùng pnpm qua Corepack
```

## 5. Ví dụ thực tế từ Source Code

[`infrastructure/docker/Dockerfile.service`](../../infrastructure/docker/Dockerfile.service):

```dockerfile
FROM node:22-alpine
WORKDIR /workspace
RUN corepack enable && pnpm install --no-frozen-lockfile
```
