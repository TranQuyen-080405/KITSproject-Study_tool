# pnpm & Workspace

## 1. Đây là gì?

pnpm là **công cụ cài thư viện** (giống npm/yarn nhưng tiết kiệm dung lượng hơn).  
Workspace = chế độ “một repo, nhiều package” — pnpm biết `apps/*` và `packages/*` thuộc cùng dự án.

## 2. Vai trò trong dự án

Root `package.json` khai báo `"packageManager": "pnpm@10.14.0"`. Mọi app/service là package riêng nhưng cài dependency qua một lệnh ở gốc repo. Docker Compose cũng gọi `pnpm --filter ...` để chọn đúng service.

## 3. Cách thức hoạt động

1. Đọc `pnpm-workspace.yaml` để biết package nào thuộc workspace  
2. Đọc từng `package.json` để biết cần thư viện gì  
3. Tải về `node_modules` (và tạo `pnpm-lock.yaml` khi cài có lock)

Trên máy chưa có lệnh `pnpm` global, project đang dùng: `corepack pnpm ...`

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter @korean-learning/api-gateway dev
corepack pnpm --recursive run typecheck
```

## 5. Ví dụ thực tế từ Source Code

[`package.json`](../../package.json) (root):

```json
{
  "name": "korean-learning-app",
  "packageManager": "pnpm@10.14.0",
  "scripts": {
    "typecheck": "corepack pnpm --recursive run typecheck",
    "test": "corepack pnpm --recursive run test"
  }
}
```
