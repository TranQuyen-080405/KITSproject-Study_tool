# Cấu trúc một backend service

## 1. Đây là gì?

Đây không phải một thư viện, mà **cách xếp thư mục bên trong mỗi service** để tách: nhận HTTP → xử lý nghiệp vụ → truy cập DB → (sau này) gửi event.

## 2. Vai trò trong dự án

Mọi service (user, content, learning, ai, analytics) và gateway dùng pattern giống nhau để team dễ nhảy giữa service mà không học layout mới. Logic nghiệp vụ **không** nhét chung một folder `shared-business-logic`.

## 3. Cách thức hoạt động

Luồng dự kiến khi có request:

```text
routes → controllers → services → repositories → database (Prisma/Postgres)
                              ↘ events → RabbitMQ (sau này)
```

| Thư mục | Việc |
| --- | --- |
| `routes/` | Khai báo URL |
| `controllers/` | Nhận request/response HTTP |
| `services/` | Business logic |
| `repositories/` | Đọc/ghi DB |
| `config/` | Cấu hình service |
| `events/` | Producer/consumer message |
| `prisma/` | Schema DB của **riêng** service |
| `tests/` | Kiểm thử |

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

```bash
# Kiểm tra TypeScript của một service
corepack pnpm --filter @korean-learning/learning-service typecheck

# Chạy test của một service
corepack pnpm --filter @korean-learning/learning-service test
```

## 5. Ví dụ thực tế từ Source Code

Cấu trúc User Service:

```text
apps/user-service/
├── src/
│   ├── app.ts
│   ├── index.ts
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── config/
│   └── events/
├── prisma/schema.prisma
├── tests/
├── package.json
└── README.md
```
