# .env & .gitignore

## 1. Đây là gì?

`.env` = file chứa **biến môi trường** (URL database, mật khẩu, khóa API…). Không nên commit lên Git.  
`.gitignore` = danh sách file/thư mục Git **không theo dõi** (`node_modules`, `.env`, build…).

## 2. Vai trò trong dự án

Mỗi service giữ một file `.env` trong thư mục của nó. `.gitignore` đã loại `.env` để tránh lộ secret.

## 3. Cách thức hoạt động

Sửa `.env` của đúng service. App/Prisma đọc `process.env` hoặc file đó. Git bỏ qua `.env` nhờ `.gitignore`.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
# Xem file bị ignore
git status
```

Cú pháp `.env`:

```env
KEY=value
```

## 5. Ví dụ thực tế từ Source Code

`apps/user-service/.env`:

```env
USER_DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/user_service
JWT_SECRET=replace-with-a-long-random-secret
```

[`.gitignore`](../../.gitignore):

```text
node_modules/
dist/
.env
.env.local
```
