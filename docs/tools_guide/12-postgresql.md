# PostgreSQL

## 1. Đây là gì?

PostgreSQL (Postgres) là **cơ sở dữ liệu quan hệ**: lưu dữ liệu dạng bảng (user, flashcard, lịch review…). Backend đọc/ghi qua Prisma.

## 2. Vai trò trong dự án

Không dùng một database dùng chung cho mọi service. `docker-compose.yml` chuẩn bị **5 container Postgres** riêng:

- `user-postgres` → `user_service`
- `content-postgres` → `content_service`
- `learning-postgres` → `learning_service`
- `ai-postgres` → `ai_service`
- `analytics-postgres` → `analytics_service`

URL mẫu nằm trong `.env.example`.

## 3. Cách thức hoạt động

Service User chỉ nối tới `USER_DATABASE_URL`. Analytics không được đọc DB của Learning; sau này nhận event qua RabbitMQ rồi tự lưu bản thống kê của mình.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
# Khi có Docker
docker compose up user-postgres -d

# Kết nối thử (nếu đã cài psql)
psql "postgresql://postgres:postgres@localhost:5433/user_service"
```

SQL cơ bản (sẽ gặp sau này): `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

## 5. Ví dụ thực tế từ Source Code

[`.env.example`](../../.env.example):

```env
USER_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/user_service
LEARNING_DATABASE_URL=postgresql://postgres:postgres@localhost:5435/learning_service
```

Trong Compose (rút gọn):

```yaml
user-postgres:
  image: postgres:17
  environment:
    POSTGRES_DB: user_service
    POSTGRES_PASSWORD: postgres
```
