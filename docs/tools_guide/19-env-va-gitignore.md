# .env & .gitignore

## 1. Đây là gì?

`.env` = file chứa **biến môi trường** (URL database, mật khẩu, khóa API…). Không nên commit lên Git.  
`.env.example` = bản mẫu **không có secret thật**, để người mới biết cần biến nào.  
`.gitignore` = danh sách file/thư mục Git **không theo dõi** (`node_modules`, `.env`, build…).

## 2. Vai trò trong dự án

Mỗi service cần URL DB riêng và RabbitMQ URL. `.env.example` liệt kê sẵn các biến đó. `.gitignore` đã loại `.env` để tránh lộ secret.

## 3. Cách thức hoạt động

Bạn copy `.env.example` → `.env` → sửa giá trị local. App/Prisma đọc `process.env` / `env("...")`. Git bỏ qua `.env` nhờ `.gitignore`.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
# Windows PowerShell
Copy-Item .env.example .env

# Xem file bị ignore
git status
```

Cú pháp `.env`:

```env
KEY=value
```

## 5. Ví dụ thực tế từ Source Code

[`.env.example`](../../.env.example):

```env
USER_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/user_service
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

[`.gitignore`](../../.gitignore):

```text
node_modules/
dist/
.env
.env.local
```
