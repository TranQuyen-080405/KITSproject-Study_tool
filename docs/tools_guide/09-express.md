# Express.js

## 1. Đây là gì?

Express là **thư viện tạo HTTP API** trên Node.js: nhận request từ client (web/mobile/gateway), trả JSON hoặc lỗi. Giống “người gác cổng + hướng dẫn đường” cho từng URL.

## 2. Vai trò trong dự án

API Gateway và mọi microservice backend đều phụ thuộc `express`. Sau này:

- Gateway nhận request công khai rồi chuyển tiếp  
- User/Content/Learning… nhận request nội bộ và xử lý domain riêng  

Hiện mới tạo `app = express()` — chưa gắn route thật.

## 3. Cách thức hoạt động

Client gọi URL → Express khớp route → controller/service xử lý → trả response. Middleware (auth, log…) sẽ gắn vào `app` sau này.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
corepack pnpm --filter @korean-learning/api-gateway dev
```

Cú pháp hay gặp (sẽ dùng khi implement):

```ts
import express from "express";
const app = express();
app.get("/health", (_req, res) => res.json({ ok: true }));
app.listen(3000);
```

## 5. Ví dụ thực tế từ Source Code

[`apps/user-service/src/app.ts`](../../apps/user-service/src/app.ts):

```ts
// This file will configure the Express application for the User Service.
import express from "express";

export const app = express();
```

[`apps/user-service/src/routes/index.ts`](../../apps/user-service/src/routes/index.ts) đã tạo `Router()` placeholder cho route sau này.
