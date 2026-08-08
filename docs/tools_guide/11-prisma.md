# Prisma

## 1. Đây là gì?

Prisma là **ORM** (công cụ giúp code TypeScript nói chuyện với database dễ hơn). Bạn mô tả bảng trong file `schema.prisma`; Prisma giúp tạo client để đọc/ghi dữ liệu thay vì viết SQL thuần mọi nơi.

## 2. Vai trò trong dự án

Mỗi business service có **một** `prisma/schema.prisma` riêng — thể hiện nguyên tắc database-per-service. Hiện schema chỉ khai báo PostgreSQL + URL env, **chưa có model nghiệp vụ** (User, Flashcard…).

## 3. Cách thức hoạt động

1. Viết model trong `schema.prisma`  
2. Chạy migrate để cập nhật Postgres  
3. Dùng Prisma Client trong `repositories/`  

Gateway không có Prisma vì không sở hữu database.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

(Khi bắt đầu dùng DB thật — hiện chưa gắn script trong package):

```bash
npx prisma migrate dev
npx prisma generate
npx prisma studio
```

Từ khóa trong schema: `generator`, `datasource`, `model`, `env("...")`.

## 5. Ví dụ thực tế từ Source Code

[`apps/user-service/prisma/schema.prisma`](../../apps/user-service/prisma/schema.prisma):

```prisma
// This Prisma schema will define the database owned by the User Service.
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("USER_DATABASE_URL")
}

// TODO: Add only models owned by this service.
```
