# TypeScript

## 1. Đây là gì?

TypeScript (TS) là JavaScript **có kiểu dữ liệu**. Giống viết code kèm “nhãn tên” cho biến/hàm để máy và người dễ bắt lỗi sớm. File thường kết thúc bằng `.ts` (logic) hoặc `.tsx` (UI React).

## 2. Vai trò trong dự án

Web, mobile, gateway, mọi service đều dùng TypeScript. Có `tsconfig.base.json` chung ở root; mỗi package `extends` file đó. Script `typecheck` chạy `tsc --noEmit` để kiểm tra kiểu mà không tạo file build.

## 3. Cách thức hoạt động

Bạn viết `.ts` → `tsc` (TypeScript Compiler) kiểm tra / biên dịch. Trong dev backend, `tsx` chạy `.ts` trực tiếp. `tsconfig.json` quyết định quy tắc (strict, module…).

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
tsc --noEmit          # chỉ kiểm tra lỗi kiểu
corepack pnpm typecheck
```

Cú pháp hay gặp:

```ts
const name: string = "Hangeul";
export function greet(user: string): string {
  return `Hello ${user}`;
}
```

## 5. Ví dụ thực tế từ Source Code

[`tsconfig.base.json`](../../tsconfig.base.json):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true
  }
}
```

[`apps/user-service/src/app.ts`](../../apps/user-service/src/app.ts):

```ts
import express from "express";
export const app = express();
```
