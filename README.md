# Lệnh chạy
corepack pnpm --filter @korean-learning/web dev


# Korean Learning App

Ứng dụng học từ vựng tiếng Hàn hỗ trợ AI, đồng thời dùng để thực hành kiến trúc microservices và hệ thống phân tán.

## Tính năng chính

1. Sinh từ vựng bằng AI
2. Tạo và quản lý flashcard
3. Chế độ học flashcard
4. Theo dõi trạng thái thuộc / chưa thuộc
5. Ôn tập hàng ngày theo SRS
6. Theo dõi tiến độ học
7. Dashboard
8. Quiz ôn tập do AI tạo

## Kiến trúc hệ thống

```text
Web / Mobile
      ↓
API Gateway
      ↓
Microservices
      ↓
Database do từng service sở hữu

Sự kiện học tập
      ↓
RabbitMQ
      ↓
Analytics
```

## Các service

- **API Gateway** — cổng vào công khai và định tuyến request (sau này).
- **User Service** — xác thực, hồ sơ người dùng và tùy chọn học tập.
- **Content Service** — bộ flashcard, thẻ flashcard và từ vựng.
- **Learning Service** — bản ghi học, tiến độ, ôn tập và logic SRS (sau này).
- **AI Service** — sinh nội dung / giải thích nhờ LLM bên ngoài (sau này).
- **Analytics Service** — thống kê học tập theo sự kiện và dữ liệu dashboard.

## Công nghệ sử dụng

React, React Native, Expo, Node.js, Express, TypeScript, PostgreSQL, Prisma, RabbitMQ, Vitest, Docker và Docker Compose.

## Cấu trúc repository

- `apps/` — web, mobile, gateway và các service tách biệt.
- `packages/` — type, validation và tiện ích cấu hình dùng chung tối thiểu.
- `infrastructure/` — chỗ chuẩn bị Docker, RabbitMQ và PostgreSQL local.
- `docs/architecture/` — mô tả quyền sở hữu service và ranh giới giao tiếp.

## Các giai đoạn triển khai tiếp theo

1. Skeleton dự án
2. Xác thực (Authentication)
3. Quản lý flashcard
4. Học tập và SRS
5. Sinh nội dung bằng AI
6. Analytics theo sự kiện
7. Observability
8. Deployment
