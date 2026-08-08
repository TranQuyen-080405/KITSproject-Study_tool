# package.json

## 1. Đây là gì?

`package.json` là **thẻ căn cước** của một package Node: tên gì, chạy lệnh gì, phụ thuộc thư viện nào. Mỗi app/service trong monorepo đều có một file này.

## 2. Vai trò trong dự án

- Root: script chung (`typecheck`, `test`) và khai báo pnpm  
- Từng service: dependency `express`, script `dev` / `typecheck` / `test`  
- Web/mobile: dependency React / Expo  

Không có `package.json` thì pnpm không biết cài gì và chạy script nào.

## 3. Cách thức hoạt động

Khi bạn gõ `pnpm run typecheck`, pnpm tìm khóa `"typecheck"` trong `"scripts"` rồi chạy lệnh tương ứng. `"dependencies"` là thư viện runtime; `"devDependencies"` là công cụ lúc code (TypeScript types, tsx…).

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
# Trong một package
pnpm run dev
pnpm run typecheck
pnpm run test

# Từ root, chọn đúng package theo name
corepack pnpm --filter @korean-learning/user-service run typecheck
```

Các field hay gặp: `name`, `scripts`, `dependencies`, `devDependencies`, `private`, `type`.

## 5. Ví dụ thực tế từ Source Code

[`apps/user-service/package.json`](../../apps/user-service/package.json):

```json
{
  "name": "@korean-learning/user-service",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
```
