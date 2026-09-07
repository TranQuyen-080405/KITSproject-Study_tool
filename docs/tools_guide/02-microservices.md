# Microservices

## 1. Đây là gì?

Microservices = chia hệ thống thành **nhiều dịch vụ nhỏ**, mỗi dịch vụ lo một “miếng việc” rõ ràng, có thể phát triển và (sau này) triển khai độc lập.

Khác với “một backend khổng lồ làm hết mọi thứ”.

## 2. Vai trò trong dự án

App học từ vựng Hàn sẽ có đăng nhập, flashcard, SRS, AI, thống kê. Project cố ý tách để luyện kiến trúc phân tán:

| Service | Việc chính |
| --- | --- |
| API Gateway | Cổng vào từ web/mobile |
| User | Tài khoản, hồ sơ |
| Content | Flashcard / từ vựng |
| AI | Gọi LLM |
| Analytics | Review/SRS nhẹ, dashboard |

Mỗi business service sẽ có **database riêng** (database-per-service).

## 3. Cách thức hoạt động

Luồng dự kiến:

```text
Web / Mobile → API Gateway → các service (REST)
```

Hiện tại mới có khung thư mục và file placeholder — chưa có logic nghiệp vụ.

## 4. Các câu lệnh (Commands) & Cú pháp thường dùng

Chưa có lệnh “chạy cả cụm microservices” hoàn chỉnh. Sau này thường dùng:

```bash
docker compose up
```

Xem mô tả ranh giới service:

```text
docs/architecture/service-boundaries.md
docs/architecture/overview.md
```

## 5. Ví dụ thực tế từ Source Code

Các app backend trong repo:

```text
apps/api-gateway/
apps/user-service/
apps/content-service/
apps/ai-service/
apps/analytics-service/
```

Mỗi service (trừ gateway) có `prisma/schema.prisma` riêng — không dùng chung một database module.
